/**
 * Enhanced Authentication Middleware for EchoTune AI
 * JWT/Session verification with Redis backing
 */

const AuthService = require('./auth-service');
const { getRateLimitKey } = require('../utils/auth-helpers');

/**
 * Create authentication middleware instance
 */
function createAuthMiddleware(options = {}) {
  const authService = new AuthService(options);

  // Allow Redis manager injection
  if (options.redisManager) {
    authService.setRedisManager(options.redisManager);
  }

  /**
   * Middleware to extract and verify authentication
   * Replaces the basic extractUser middleware
   */
  async function extractAuth(req, res, next) {
    try {
      let token = null;
      let sessionId = null;

      // Check Authorization header (Bearer token)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      // Check for token in cookies
      if (!token && req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }

      // Check for session ID in cookies
      if (req.cookies && req.cookies.session_id) {
        sessionId = req.cookies.session_id;
      }

      // Store client info for security
      req.clientInfo = {
        ip: getClientIP(req),
        userAgent: req.get('User-Agent') || 'unknown'
      };

      // Initialize auth context
      req.auth = {
        isAuthenticated: false,
        user: null,
        session: null,
        spotifyTokens: null,
        sessionId: sessionId,
        authService: authService
      };

      // If we have a token, verify it
      if (token) {
        const verification = await authService.verifyToken(token);
        
        if (verification.valid) {
          req.auth.isAuthenticated = true;
          req.auth.user = verification.user;
          req.auth.session = verification.session;
          req.auth.spotifyTokens = verification.spotifyTokens;
          req.auth.sessionId = verification.session.sessionId;

          // Legacy compatibility
          req.user = verification.user;
          req.userId = verification.user.id;
          req.spotifyTokens = verification.spotifyTokens;
        } else {
          console.warn(`Token verification failed: ${verification.error}`);
        }
      }

      next();

    } catch (error) {
      console.error('Auth middleware error:', error);
      // Continue without authentication rather than blocking the request
      next();
    }
  }

  /**
   * Require authentication middleware
   * Replaces the basic requireAuth middleware
   */
  function requireAuth(req, res, next) {
    if (!req.auth || !req.auth.isAuthenticated) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
        code: 'UNAUTHORIZED'
      });
    }

    // Check if session is still valid
    if (!req.auth.session) {
      return res.status(401).json({
        error: 'Session invalid',
        message: 'Your session has expired. Please log in again.',
        code: 'SESSION_EXPIRED'
      });
    }

    next();
  }

  /**
   * Optional authentication middleware
   * Sets user info if available but doesn't require it
   */
  function optionalAuth(req, res, next) {
    // extractAuth already handles optional authentication
    next();
  }

  /**
   * Require specific Spotify scopes
   */
  function requireScopes(requiredScopes = []) {
    return (req, res, next) => {
      if (!req.auth || !req.auth.isAuthenticated) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      // For now, assume all required scopes are granted during auth
      // In a full implementation, you'd check the actual granted scopes
      const userScopes = req.auth.session?.scopes || authService.config.spotify.scopes;
      const hasRequiredScopes = requiredScopes.every(scope => userScopes.includes(scope));

      if (!hasRequiredScopes) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Additional Spotify permissions required',
          required_scopes: requiredScopes,
          granted_scopes: userScopes
        });
      }

      next();
    };
  }

  /**
   * Development mode bypass (compatible with existing AUTH_DEVELOPMENT_MODE)
   */
  function developmentBypass(req, res, next) {
    if (process.env.AUTH_DEVELOPMENT_MODE === 'true') {
      // In development mode, allow simple bearer tokens
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ') && !req.auth.isAuthenticated) {
        const token = authHeader.substring(7);
        
        // Create a mock user for development
        req.auth.isAuthenticated = true;
        req.auth.user = {
          id: token,
          display_name: `Dev User ${token}`,
          email: `dev-${token}@example.com`,
          country: 'US',
          premium: true,
          followers: 0
        };
        req.auth.session = {
          sessionId: `dev-${token}`,
          createdAt: new Date(),
          lastActivity: new Date()
        };
        
        // Legacy compatibility
        req.user = req.auth.user;
        req.userId = req.auth.user.id;
        
        console.log(`[DEV MODE] Authenticated user: ${token}`);
      }
    }
    next();
  }

  /**
   * Rate limiting for authentication endpoints
   */
  function authRateLimit(req, res, next) {
    const key = getRateLimitKey(req, 'auth');
    
    // For now, just log the rate limit attempt
    // In production, this would integrate with Redis rate limiter
    console.log(`Auth rate limit check for key: ${key}`);
    next();
  }

  return {
    authService,
    extractAuth,
    requireAuth,
    optionalAuth,
    requireScopes,
    developmentBypass,
    authRateLimit
  };
}

/**
 * Get client IP with proxy support
 */
function getClientIP(req) {
  return req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown';
}

/**
 * Session cleanup middleware
 * Periodically clean up expired sessions
 */
function sessionCleanup(authService, intervalMs = 60000) {
  let cleanupInterval;

  function startCleanup() {
    cleanupInterval = setInterval(async () => {
      try {
        // This would be implemented to clean up expired sessions
        console.log('Session cleanup check...');
        
        // If using Redis, expired keys are automatically cleaned up
        // For in-memory storage, we'd need to implement manual cleanup
        
      } catch (error) {
        console.error('Session cleanup error:', error);
      }
    }, intervalMs);
  }

  function stopCleanup() {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }

  return {
    start: startCleanup,
    stop: stopCleanup
  };
}

module.exports = {
  createAuthMiddleware,
  sessionCleanup,
  getClientIP
};