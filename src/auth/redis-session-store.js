/**
 * Redis Session Store for Express Session
 * Integrates with existing Redis manager
 */

const session = require('express-session');

class RedisSessionStore extends session.Store {
  constructor(redisManager, options = {}) {
    super(options);
    this.redisManager = redisManager;
    this.prefix = options.prefix || 'sess:';
    this.ttl = options.ttl || 86400; // 24 hours default
  }

  /**
   * Get session from Redis
   */
  async get(sessionId, callback) {
    try {
      const key = this.prefix + sessionId;
      const sessionData = await this.redisManager.get(key);
      
      if (sessionData) {
        callback(null, sessionData);
      } else {
        callback(null, null);
      }
    } catch (error) {
      console.error('Redis session get error:', error);
      callback(error);
    }
  }

  /**
   * Set session in Redis
   */
  async set(sessionId, sessionData, callback) {
    try {
      const key = this.prefix + sessionId;
      
      // Calculate TTL from maxAge or use default
      let ttl = this.ttl;
      if (sessionData.cookie && sessionData.cookie.maxAge) {
        ttl = Math.floor(sessionData.cookie.maxAge / 1000);
      }

      await this.redisManager.set(key, sessionData, ttl);
      callback && callback(null, 'OK');
    } catch (error) {
      console.error('Redis session set error:', error);
      callback && callback(error);
    }
  }

  /**
   * Destroy session in Redis
   */
  async destroy(sessionId, callback) {
    try {
      const key = this.prefix + sessionId;
      await this.redisManager.del(key);
      callback && callback(null);
    } catch (error) {
      console.error('Redis session destroy error:', error);
      callback && callback(error);
    }
  }

  /**
   * Touch session to refresh TTL
   */
  async touch(sessionId, sessionData, callback) {
    try {
      // Refresh the session TTL
      await this.set(sessionId, sessionData, callback);
    } catch (error) {
      console.error('Redis session touch error:', error);
      callback && callback(error);
    }
  }

  /**
   * Get all session keys (for cleanup purposes)
   */
  async all(callback) {
    try {
      // This would require scanning Redis keys
      // For now, return empty array as this is rarely used
      callback && callback(null, []);
    } catch (error) {
      console.error('Redis session all error:', error);
      callback && callback(error);
    }
  }

  /**
   * Clear all sessions
   */
  async clear(callback) {
    try {
      // This would require scanning and deleting all session keys
      // For now, just acknowledge
      callback && callback(null);
    } catch (error) {
      console.error('Redis session clear error:', error);
      callback && callback(error);
    }
  }

  /**
   * Get session count
   */
  async length(callback) {
    try {
      // This would require counting session keys
      // For now, return 0 as this is rarely used
      callback && callback(null, 0);
    } catch (error) {
      console.error('Redis session length error:', error);
      callback && callback(error);
    }
  }
}

/**
 * Create Express session middleware with Redis store
 */
function createRedisSession(redisManager, options = {}) {
  const sessionOptions = {
    store: new RedisSessionStore(redisManager, {
      prefix: options.prefix || 'echotune:session:',
      ttl: options.ttl || 7 * 24 * 60 * 60 // 7 days
    }),
    secret: process.env.SESSION_SECRET || 'fallback-dev-secret-change-in-production',
    name: 'echotune.session',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: options.maxAge || 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    },
    ...options
  };

  return session(sessionOptions);
}

module.exports = {
  RedisSessionStore,
  createRedisSession
};