/**
 * Authentication Helpers for EchoTune AI
 * PKCE OAuth 2.0 utilities, JWT token handling, and session management
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * Generate PKCE code challenge and verifier
 * @returns {Object} Object containing code_verifier and code_challenge
 */
function generatePKCEChallenge() {
  const code_verifier = crypto.randomBytes(32).toString('base64url');
  const code_challenge = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');
  
  return {
    code_verifier,
    code_challenge,
    code_challenge_method: 'S256'
  };
}

/**
 * Generate secure nonce for OAuth state
 * @returns {string} Secure nonce
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Create JWT token with user data
 * @param {Object} payload - User payload data
 * @param {string} secret - JWT secret
 * @param {Object} options - JWT options
 * @returns {string} JWT token
 */
function createJWT(payload, secret, options = {}) {
  const defaultOptions = {
    expiresIn: '1h',
    issuer: 'echotune-ai',
    audience: 'echotune-users',
    ...options
  };
  
  // Ensure expiresIn is valid
  if (typeof defaultOptions.expiresIn === 'number') {
    defaultOptions.expiresIn = `${defaultOptions.expiresIn}s`;
  }
  
  return jwt.sign(payload, secret, defaultOptions);
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - JWT secret
 * @returns {Object} Decoded payload or null if invalid
 */
function verifyJWT(token, secret) {
  try {
    return jwt.verify(token, secret, {
      issuer: 'echotune-ai',
      audience: 'echotune-users'
    });
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
}

/**
 * Create refresh token
 * @param {Object} payload - User payload data
 * @param {string} secret - JWT secret
 * @returns {string} Refresh token
 */
function createRefreshToken(payload, secret) {
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
    issuer: 'echotune-ai-refresh',
    audience: 'echotune-users'
  });
}

/**
 * Verify refresh token
 * @param {string} token - Refresh token to verify
 * @param {string} secret - JWT secret
 * @returns {Object} Decoded payload or null if invalid
 */
function verifyRefreshToken(token, secret) {
  try {
    return jwt.verify(token, secret, {
      issuer: 'echotune-ai-refresh',
      audience: 'echotune-users'
    });
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    return null;
  }
}

/**
 * Generate secure session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Hash password with salt (for future user accounts if needed)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

/**
 * Verify password against hash (for future user accounts if needed)
 * @param {string} password - Plain text password
 * @param {string} hash - Stored password hash
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.pbkdf2(password, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

/**
 * Sanitize user data for token payload
 * @param {Object} spotifyUser - Spotify user object
 * @returns {Object} Sanitized user data
 */
function sanitizeUserData(spotifyUser) {
  return {
    id: spotifyUser.id,
    display_name: spotifyUser.display_name,
    email: spotifyUser.email,
    country: spotifyUser.country,
    premium: spotifyUser.product === 'premium',
    followers: spotifyUser.followers?.total || 0,
    images: spotifyUser.images?.[0]?.url || null,
    created_at: new Date().toISOString()
  };
}

/**
 * Create secure cookie options
 * @param {boolean} isProduction - Whether running in production
 * @returns {Object} Cookie options
 */
function getSecureCookieOptions(isProduction = false) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  };
}

/**
 * Validate Spotify access token format
 * @param {string} token - Token to validate
 * @returns {boolean} True if token format is valid
 */
function isValidSpotifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  // Spotify access tokens are typically 83+ characters long
  return token.length >= 83 && /^[A-Za-z0-9_-]+$/.test(token);
}

/**
 * Rate limiting key generator
 * @param {Object} req - Express request object
 * @param {string} type - Type of rate limit ('auth', 'api', etc.)
 * @returns {string} Rate limit key
 */
function getRateLimitKey(req, type = 'default') {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = req.user?.id || req.userId || 'anonymous';
  return `rate_limit:${type}:${userId}:${ip}`;
}

/**
 * Generate Content Security Policy header
 * @param {boolean} isDevelopment - Whether running in development
 * @returns {string} CSP header value
 */
function generateCSP(isDevelopment = false) {
  const basePolicy = [
    'default-src \'self\'',
    'script-src \'self\' \'unsafe-inline\' https://api.spotify.com https://sdk.scdn.co',
    'style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com',
    'font-src \'self\' https://fonts.gstatic.com',
    'img-src \'self\' data: https://i.scdn.co https://mosaic.scdn.co https://lineup-images.scdn.co',
    'connect-src \'self\' https://api.spotify.com https://accounts.spotify.com wss:',
    'media-src \'self\' https://p.scdn.co',
    'frame-src https://open.spotify.com https://sdk.scdn.co',
    'worker-src \'self\' blob:',
    'child-src \'self\' https://open.spotify.com'
  ];

  if (isDevelopment) {
    // Allow localhost connections in development
    basePolicy[3] = 'connect-src \'self\' https://api.spotify.com https://accounts.spotify.com ws://localhost:* wss://localhost:* http://localhost:*';
  }

  return basePolicy.join('; ');
}

/**
 * Security headers configuration
 * @param {boolean} isProduction - Whether running in production
 * @returns {Object} Security headers object
 */
function getSecurityHeaders(isProduction = false) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'microphone=(), camera=(), geolocation=()',
    'Content-Security-Policy': generateCSP(!isProduction),
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    })
  };
}

module.exports = {
  generateRandomString,
  generatePKCEChallenge,
  generateNonce,
  createJWT,
  verifyJWT,
  createRefreshToken,
  verifyRefreshToken,
  generateSessionId,
  hashPassword,
  verifyPassword,
  sanitizeUserData,
  getSecureCookieOptions,
  isValidSpotifyToken,
  getRateLimitKey,
  generateCSP,
  getSecurityHeaders
};