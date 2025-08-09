/**
 * Authentication Routes for EchoTune AI
 * PKCE OAuth 2.0 endpoints with Redis sessions
 */

const express = require('express');
const AuthService = require('./auth-service');
const { getClientIP } = require('./auth-middleware');

const router = express.Router();

/**
 * Initialize auth service
 * Redis manager will be injected by the main server
 */
let authService = null;

function initializeAuthRoutes(redisManager = null) {
  authService = new AuthService();
  if (redisManager) {
    authService.setRedisManager(redisManager);
  }
  return router;
}

/**
 * GET /auth/login
 * Start PKCE OAuth flow
 */
router.get('/login', async (req, res) => {
  try {
    if (!authService) {
      return res.status(500).json({
        error: 'Auth service not initialized',
        message: 'Authentication service is not available'
      });
    }

    const options = {
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      forceDialog: req.query.force === 'true'
    };

    const authUrl = authService.generateAuthUrl(options);

    res.json({
      success: true,
      authUrl: authUrl.authUrl,
      state: authUrl.state,
      message: 'Redirect user to authUrl to start authentication'
    });

  } catch (error) {
    console.error('Login endpoint error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * GET /auth/callback
 * Handle OAuth callback with PKCE
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.status(400).json({
        error: 'OAuth error',
        message: oauthError === 'access_denied' ? 
          'User denied access to Spotify account' : 
          `OAuth error: ${oauthError}`
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Authorization code and state are required'
      });
    }

    if (!authService) {
      return res.status(500).json({
        error: 'Auth service not initialized'
      });
    }

    const options = {
      ip: getClientIP(req),
      userAgent: req.get('User-Agent')
    };

    const result = await authService.handleCallback(code, state, options);

    // Set secure cookies
    const cookieOptions = authService.getCookieOptions();
    
    res.cookie('auth_token', result.tokens.access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000 // 1 hour for access token
    });
    
    res.cookie('refresh_token', result.tokens.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
    });
    
    res.cookie('session_id', result.session.sessionId, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for session
    });

    res.json({
      success: true,
      user: result.user,
      session: result.session,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Callback endpoint error:', error);
    res.status(400).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    let refreshToken = req.body.refresh_token;
    
    // Check cookies if not in body
    if (!refreshToken && req.cookies?.refresh_token) {
      refreshToken = req.cookies.refresh_token;
    }

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        message: 'Please provide refresh token'
      });
    }

    if (!authService) {
      return res.status(500).json({
        error: 'Auth service not initialized'
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    // Update access token cookie
    const cookieOptions = authService.getCookieOptions();
    res.cookie('auth_token', result.access_token, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    res.json({
      success: true,
      access_token: result.access_token,
      token_type: result.token_type,
      expires_in: result.expires_in,
      user: result.user,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh endpoint error:', error);
    
    // Clear invalid refresh token cookies
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');
    res.clearCookie('session_id');
    
    res.status(401).json({
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

/**
 * POST /auth/logout
 * Logout and destroy session
 */
router.post('/logout', async (req, res) => {
  try {
    let sessionId = req.body.session_id;
    
    // Check cookies and auth context
    if (!sessionId && req.cookies?.session_id) {
      sessionId = req.cookies.session_id;
    }
    
    if (!sessionId && req.auth?.sessionId) {
      sessionId = req.auth.sessionId;
    }

    if (authService && sessionId) {
      await authService.logout(sessionId);
    }

    // Clear all auth cookies
    const cookieOptions = { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };
    
    res.clearCookie('auth_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    res.clearCookie('session_id', cookieOptions);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout endpoint error:', error);
    
    // Still clear cookies even if logout fails
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');
    res.clearCookie('session_id');
    
    res.json({
      success: true,
      message: 'Logged out (session cleanup may have failed)'
    });
  }
});

/**
 * GET /auth/me
 * Get current user info (protected route)
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.auth || !req.auth.isAuthenticated) {
      return res.status(401).json({
        error: 'Authorization required',
        message: 'Please log in to access user information'
      });
    }

    res.json({
      success: true,
      user: req.auth.user,
      session: {
        sessionId: req.auth.sessionId,
        lastActivity: req.auth.session?.lastActivity,
        createdAt: req.auth.session?.createdAt
      },
      spotify: {
        hasTokens: !!req.auth.spotifyTokens,
        tokenExpiry: req.auth.spotifyTokens?.expires_at
      }
    });

  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      message: error.message
    });
  }
});

/**
 * GET /auth/status
 * Check authentication status and service health
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      authenticated: req.auth?.isAuthenticated || false,
      user: req.auth?.user || null,
      development_mode: process.env.AUTH_DEVELOPMENT_MODE === 'true'
    };

    if (authService) {
      const healthCheck = await authService.healthCheck();
      status.service = healthCheck;
    } else {
      status.service = { error: 'Auth service not initialized' };
    }

    res.json(status);

  } catch (error) {
    console.error('Status endpoint error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
});

/**
 * Development endpoints (only available in dev mode)
 */
if (process.env.NODE_ENV !== 'production' || process.env.AUTH_DEVELOPMENT_MODE === 'true') {
  /**
   * POST /auth/dev/login
   * Development mode login bypass
   */
  router.post('/dev/login', (req, res) => {
    if (process.env.AUTH_DEVELOPMENT_MODE !== 'true') {
      return res.status(404).json({ error: 'Endpoint not available' });
    }

    const { userId = 'dev-user', displayName = 'Development User' } = req.body;

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    };

    // Create simple dev token
    res.cookie('auth_token', `dev-token-${userId}`, cookieOptions);
    res.cookie('session_id', `dev-session-${userId}`, cookieOptions);

    res.json({
      success: true,
      user: {
        id: userId,
        display_name: displayName,
        email: `${userId}@dev.example.com`,
        premium: true
      },
      message: 'Development login successful'
    });
  });
}

module.exports = {
  router,
  initializeAuthRoutes
};