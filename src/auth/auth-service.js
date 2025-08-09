/**
 * Secure Authentication Service for EchoTune AI
 * Implements PKCE OAuth 2.0 flow, JWT tokens, and Redis sessions
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { URLSearchParams } = require('url');
const {
  generatePKCEChallenge,
  generateNonce,
  generateRandomString,
  createJWT,
  verifyJWT,
  createRefreshToken,
  verifyRefreshToken,
  sanitizeUserData,
  getSecureCookieOptions
} = require('../utils/auth-helpers');

class AuthService {
  constructor(options = {}) {
    this.config = {
      spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI,
        scopes: [
          'user-read-private',
          'user-read-email', 
          'playlist-modify-public',
          'playlist-modify-private',
          'user-read-recently-played',
          'user-top-read',
          'user-library-read',
          'user-library-modify'
        ]
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production',
        accessTokenExpiresIn: '1h',
        refreshTokenExpiresIn: '7d'
      },
      session: {
        secret: process.env.SESSION_SECRET || 'fallback-dev-secret-change-in-production',
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      },
      security: {
        stateTimeout: 10 * 60 * 1000, // 10 minutes
        nonceTimeout: 5 * 60 * 1000,  // 5 minutes
        maxFailedAttempts: 5,
        lockoutTime: 15 * 60 * 1000   // 15 minutes
      },
      ...options
    };

    // Merge nested spotify config if provided
    if (options.spotify) {
      this.config.spotify = {
        ...this.config.spotify,
        ...options.spotify
      };
    }

    // In-memory stores (will be replaced with Redis in production)
    this.authStates = new Map();
    this.sessions = new Map();
    this.failedAttempts = new Map();
    
    // Redis manager will be injected
    this.redisManager = null;
  }

  /**
   * Set Redis manager for session storage
   */
  setRedisManager(redisManager) {
    this.redisManager = redisManager;
  }

  /**
   * Generate authorization URL with PKCE
   */
  generateAuthUrl(options = {}) {
    if (!this.config.spotify.clientId) {
      throw new Error('Spotify client ID not configured');
    }

    // Generate PKCE challenge
    const { code_verifier, code_challenge, code_challenge_method } = generatePKCEChallenge();
    
    // Generate state and nonce for security
    const state = generateRandomString(32);
    const nonce = generateNonce();

    // Store PKCE and security parameters
    const authData = {
      code_verifier,
      code_challenge,
      code_challenge_method,
      nonce,
      timestamp: Date.now(),
      ip: options.ip || 'unknown',
      userAgent: options.userAgent || 'unknown'
    };

    this.storeAuthState(state, authData);

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.spotify.clientId,
      scope: (this.config.spotify.scopes || []).join(' '),
      redirect_uri: this.config.spotify.redirectUri,
      state: state,
      code_challenge: code_challenge,
      code_challenge_method: code_challenge_method,
      show_dialog: options.forceDialog ? 'true' : 'false'
    });

    return {
      authUrl: `https://accounts.spotify.com/authorize?${params.toString()}`,
      state: state,
      nonce: nonce
    };
  }

  /**
   * Handle OAuth callback with PKCE verification
   */
  async handleCallback(code, state, options = {}) {
    if (!code || !state) {
      throw new Error('Missing authorization code or state parameter');
    }

    // Verify and retrieve auth state
    const authData = await this.getAuthState(state);
    if (!authData) {
      throw new Error('Invalid or expired authorization state');
    }

    // Verify request origin (basic protection)
    if (options.ip && authData.ip !== 'unknown' && authData.ip !== options.ip) {
      console.warn(`State verification: IP mismatch ${authData.ip} vs ${options.ip}`);
    }

    // Check for failed attempts from this IP
    if (this.isRateLimited(options.ip)) {
      throw new Error('Too many failed authentication attempts. Please try again later.');
    }

    try {
      // Exchange authorization code for tokens using PKCE
      const tokenResponse = await this.exchangeCodeForTokens(code, authData.code_verifier);
      
      // Get user profile from Spotify
      const userProfile = await this.getSpotifyUserProfile(tokenResponse.access_token);
      
      // Create secure session and JWT tokens
      const sessionResult = await this.createUserSession(userProfile, tokenResponse);

      // Clean up auth state
      this.removeAuthState(state);

      return {
        success: true,
        user: sessionResult.user,
        session: sessionResult.session,
        tokens: {
          access_token: sessionResult.accessToken,
          refresh_token: sessionResult.refreshToken,
          expires_in: sessionResult.expiresIn
        }
      };

    } catch (error) {
      // Record failed attempt
      this.recordFailedAttempt(options.ip);
      
      console.error('OAuth callback error:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Exchange authorization code for tokens using PKCE
   */
  async exchangeCodeForTokens(code, codeVerifier) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.config.spotify.redirectUri,
      client_id: this.config.spotify.clientId,
      code_verifier: codeVerifier
    });

    // Use client credentials for authentication (PKCE doesn't require client_secret in header)
    const authHeader = Buffer.from(
      `${this.config.spotify.clientId}:${this.config.spotify.clientSecret}`
    ).toString('base64');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      }
    );

    if (!response.data.access_token) {
      throw new Error('Failed to obtain access token');
    }

    return response.data;
  }

  /**
   * Get Spotify user profile
   */
  async getSpotifyUserProfile(accessToken) {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.data;
  }

  /**
   * Create user session with JWT tokens
   */
  async createUserSession(spotifyUser, tokenResponse) {
    const user = sanitizeUserData(spotifyUser);
    const sessionId = crypto.randomBytes(32).toString('hex');

    // Create JWT access token
    const accessToken = createJWT(
      {
        userId: user.id,
        sessionId: sessionId,
        type: 'access_token'
      },
      this.config.jwt.secret,
      { expiresIn: this.config.jwt.accessTokenExpiresIn }
    );

    // Create JWT refresh token
    const refreshToken = createRefreshToken(
      {
        userId: user.id,
        sessionId: sessionId,
        type: 'refresh_token'
      },
      this.config.jwt.secret
    );

    // Session data
    const sessionData = {
      sessionId: sessionId,
      userId: user.id,
      user: user,
      spotifyTokens: {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: Date.now() + (tokenResponse.expires_in * 1000),
        token_type: tokenResponse.token_type || 'Bearer'
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      ip: user.ip || 'unknown',
      userAgent: user.userAgent || 'unknown'
    };

    // Store session
    await this.storeSession(sessionId, sessionData);

    return {
      user: user,
      session: {
        sessionId: sessionId,
        expiresAt: Date.now() + this.config.session.maxAge
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600 // 1 hour
    };
  }

  /**
   * Verify JWT token and get session
   */
  async verifyToken(token) {
    if (!token) {
      return { valid: false, error: 'Token required' };
    }

    try {
      // Verify JWT
      const decoded = verifyJWT(token, this.config.jwt.secret);
      if (!decoded) {
        return { valid: false, error: 'Invalid token' };
      }

      // Get session data
      const session = await this.getSession(decoded.sessionId);
      if (!session) {
        return { valid: false, error: 'Session not found' };
      }

      // Update last activity
      session.lastActivity = new Date();
      await this.updateSession(decoded.sessionId, session);

      return {
        valid: true,
        user: session.user,
        session: session,
        spotifyTokens: session.spotifyTokens
      };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token required');
    }

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken, this.config.jwt.secret);
      if (!decoded) {
        throw new Error('Invalid refresh token');
      }

      // Get session
      const session = await this.getSession(decoded.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Check if Spotify refresh token is still valid and refresh if needed
      const spotifyTokens = session.spotifyTokens;
      if (spotifyTokens.expires_at && Date.now() > spotifyTokens.expires_at - 60000) {
        // Refresh Spotify tokens if expiring within 1 minute
        const newSpotifyTokens = await this.refreshSpotifyToken(spotifyTokens.refresh_token);
        session.spotifyTokens = {
          ...spotifyTokens,
          ...newSpotifyTokens,
          expires_at: Date.now() + (newSpotifyTokens.expires_in * 1000)
        };
        await this.updateSession(decoded.sessionId, session);
      }

      // Create new access token
      const newAccessToken = createJWT(
        {
          userId: decoded.userId,
          sessionId: decoded.sessionId,
          type: 'access_token'
        },
        this.config.jwt.secret,
        { expiresIn: this.config.jwt.accessTokenExpiresIn }
      );

      return {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        user: session.user
      };

    } catch (error) {
      console.error('Refresh token error:', error.message);
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Refresh Spotify access token
   */
  async refreshSpotifyToken(spotifyRefreshToken) {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: spotifyRefreshToken
    });

    const authHeader = Buffer.from(
      `${this.config.spotify.clientId}:${this.config.spotify.clientSecret}`
    ).toString('base64');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      }
    );

    return response.data;
  }

  /**
   * Logout and destroy session
   */
  async logout(sessionId) {
    if (!sessionId) {
      return { success: true, message: 'No active session' };
    }

    try {
      await this.removeSession(sessionId);
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error.message);
      return { success: true, message: 'Logged out (cleanup failed)' };
    }
  }

  /**
   * Store auth state (Redis or memory)
   */
  async storeAuthState(state, data) {
    if (this.redisManager && this.redisManager.isConnected) {
      await this.redisManager.set(`auth_state:${state}`, data, 600); // 10 minutes
    } else {
      this.authStates.set(state, data);
      // Cleanup old states
      setTimeout(() => this.authStates.delete(state), this.config.security.stateTimeout);
    }
  }

  /**
   * Get auth state (Redis or memory)
   */
  async getAuthState(state) {
    if (this.redisManager && this.redisManager.isConnected) {
      return await this.redisManager.get(`auth_state:${state}`);
    } else {
      const data = this.authStates.get(state);
      if (data && Date.now() - data.timestamp > this.config.security.stateTimeout) {
        this.authStates.delete(state);
        return null;
      }
      return data;
    }
  }

  /**
   * Remove auth state (Redis or memory)
   */
  async removeAuthState(state) {
    if (this.redisManager && this.redisManager.isConnected) {
      await this.redisManager.del(`auth_state:${state}`);
    } else {
      this.authStates.delete(state);
    }
  }

  /**
   * Store session (Redis or memory)
   */
  async storeSession(sessionId, sessionData) {
    if (this.redisManager && this.redisManager.isConnected) {
      await this.redisManager.set(`session:${sessionId}`, sessionData, this.config.session.ttl);
    } else {
      this.sessions.set(sessionId, sessionData);
    }
  }

  /**
   * Get session (Redis or memory)
   */
  async getSession(sessionId) {
    if (this.redisManager && this.redisManager.isConnected) {
      return await this.redisManager.get(`session:${sessionId}`);
    } else {
      return this.sessions.get(sessionId);
    }
  }

  /**
   * Update session (Redis or memory)
   */
  async updateSession(sessionId, sessionData) {
    if (this.redisManager && this.redisManager.isConnected) {
      await this.redisManager.set(`session:${sessionId}`, sessionData, this.config.session.ttl);
    } else {
      this.sessions.set(sessionId, sessionData);
    }
  }

  /**
   * Remove session (Redis or memory)
   */
  async removeSession(sessionId) {
    if (this.redisManager && this.redisManager.isConnected) {
      await this.redisManager.del(`session:${sessionId}`);
    } else {
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Rate limiting helpers
   */
  recordFailedAttempt(ip) {
    if (!ip || ip === 'unknown') return;

    const key = `failed_auth:${ip}`;
    const current = this.failedAttempts.get(key) || { count: 0, timestamp: Date.now() };
    
    current.count++;
    current.timestamp = Date.now();
    
    this.failedAttempts.set(key, current);
    
    // Cleanup old entries
    setTimeout(() => {
      const entry = this.failedAttempts.get(key);
      if (entry && Date.now() - entry.timestamp > this.config.security.lockoutTime) {
        this.failedAttempts.delete(key);
      }
    }, this.config.security.lockoutTime);
  }

  isRateLimited(ip) {
    if (!ip || ip === 'unknown') return false;

    const key = `failed_auth:${ip}`;
    const attempts = this.failedAttempts.get(key);
    
    if (!attempts) return false;
    
    // Check if lockout period has expired
    if (Date.now() - attempts.timestamp > this.config.security.lockoutTime) {
      this.failedAttempts.delete(key);
      return false;
    }
    
    return attempts.count >= this.config.security.maxFailedAttempts;
  }

  /**
   * Get secure cookie options
   */
  getCookieOptions() {
    return getSecureCookieOptions(process.env.NODE_ENV === 'production');
  }

  /**
   * Health check
   */
  async healthCheck() {
    const status = {
      auth_service: 'healthy',
      spotify_configured: !!(this.config.spotify.clientId && this.config.spotify.clientSecret),
      redis_connected: this.redisManager ? await this.redisManager.ping().then(() => true).catch(() => false) : false,
      active_sessions: this.sessions.size,
      pending_auth_states: this.authStates.size,
      failed_attempts: this.failedAttempts.size
    };

    return status;
  }
}

module.exports = AuthService;