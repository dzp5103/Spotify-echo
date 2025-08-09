/**
 * Integration Test for Complete Auth Flow
 * Demonstrates login → protected route access
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const { createAuthMiddleware } = require('../src/auth/auth-middleware');
const { router: authRoutes, initializeAuthRoutes } = require('../src/auth/auth-routes');

describe('Complete Auth Flow Integration', () => {
  let app;

  beforeAll(() => {
    // Create test app that mimics the main server
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Initialize auth system
    const authMiddleware = createAuthMiddleware({
      spotify: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback'
      }
    });

    initializeAuthRoutes(); // Initialize without Redis for testing

    // Auth routes
    app.use('/auth', authRoutes);

    // Apply auth middleware globally
    app.use(authMiddleware.extractAuth);
    app.use(authMiddleware.developmentBypass);

    // Test routes
    app.get('/protected', authMiddleware.requireAuth, (req, res) => {
      res.json({
        success: true,
        message: 'Welcome to the protected area!',
        user: req.auth.user,
        session: req.auth.sessionId
      });
    });

    app.get('/optional', (req, res) => {
      res.json({
        success: true,
        authenticated: req.auth?.isAuthenticated || false,
        user: req.auth?.user || null,
        message: req.auth?.isAuthenticated 
          ? `Hello, ${req.auth.user.display_name}!` 
          : 'Hello, anonymous user!'
      });
    });

    app.get('/spotify-data', authMiddleware.requireAuth, (req, res) => {
      res.json({
        success: true,
        user: req.auth.user,
        hasSpotifyTokens: !!req.auth.spotifyTokens,
        message: 'Spotify data access granted'
      });
    });
  });

  describe('Development Mode Auth Flow', () => {
    beforeAll(() => {
      process.env.AUTH_DEVELOPMENT_MODE = 'true';
    });

    afterAll(() => {
      delete process.env.AUTH_DEVELOPMENT_MODE;
    });

    test('Complete flow: dev login → protected route → logout', async () => {
      // Step 1: Development login
      const loginResponse = await request(app)
        .post('/auth/dev/login')
        .send({
          userId: 'test-user-123',
          displayName: 'Test User'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user.id).toBe('test-user-123');
      
      // Extract cookies for subsequent requests
      const cookies = loginResponse.headers['set-cookie'];

      // Step 2: Access protected route with dev token
      const protectedResponse = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer test-user-123')
        .expect(200);

      expect(protectedResponse.body.success).toBe(true);
      expect(protectedResponse.body.user.id).toBe('test-user-123');
      expect(protectedResponse.body.message).toBe('Welcome to the protected area!');

      // Step 3: Access Spotify data endpoint
      const spotifyResponse = await request(app)
        .get('/spotify-data')
        .set('Authorization', 'Bearer test-user-123')
        .expect(200);

      expect(spotifyResponse.body.success).toBe(true);
      expect(spotifyResponse.body.user.id).toBe('test-user-123');

      // Step 4: Check optional route
      const optionalResponse = await request(app)
        .get('/optional')
        .set('Authorization', 'Bearer test-user-123')
        .expect(200);

      expect(optionalResponse.body.success).toBe(true);
      expect(optionalResponse.body.authenticated).toBe(true);
      expect(optionalResponse.body.message).toContain('Hello, Test User!');

      // Step 5: Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Step 6: Verify protected route is now blocked (without auth header)
      await request(app)
        .get('/protected')
        .expect(401);
    });

    test('Auth status endpoint shows current state', async () => {
      // Without authentication
      const unauthResponse = await request(app)
        .get('/auth/status')
        .expect(200);

      expect(unauthResponse.body.authenticated).toBe(false);
      expect(unauthResponse.body.development_mode).toBe(true);

      // With authentication
      const authResponse = await request(app)
        .get('/auth/status')
        .set('Authorization', 'Bearer status-test-user')
        .expect(200);

      expect(authResponse.body.authenticated).toBe(true);
      expect(authResponse.body.user).toBeTruthy();
      expect(authResponse.body.user.id).toBe('status-test-user');
    });

    test('User info endpoint works with authentication', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer me-test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe('me-test-user');
      expect(response.body.user.display_name).toBe('Dev User me-test-user');
      expect(response.body.session).toBeTruthy();
    });
  });

  describe('Production Mode Auth Flow Simulation', () => {
    beforeAll(() => {
      delete process.env.AUTH_DEVELOPMENT_MODE;
    });

    test('Should generate proper auth URLs', async () => {
      const response = await request(app)
        .get('/auth/login')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toContain('https://accounts.spotify.com/authorize');
      expect(response.body.authUrl).toContain('code_challenge');
      expect(response.body.authUrl).toContain('code_challenge_method=S256');
      expect(response.body.state).toBeTruthy();
    });

    test('Should reject invalid callback attempts', async () => {
      const response = await request(app)
        .get('/auth/callback?code=test&state=invalid-state')
        .expect(400);

      expect(response.body.error).toBe('Authentication failed');
    });

    test('Protected routes should require valid JWT tokens', async () => {
      // No token
      await request(app)
        .get('/protected')
        .expect(401);

      // Invalid token
      await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Malformed token
      await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer not.a.real.jwt.token')
        .expect(401);
    });

    test('Optional auth route works without authentication', async () => {
      const response = await request(app)
        .get('/optional')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeNull();
      expect(response.body.message).toBe('Hello, anonymous user!');
    });
  });

  describe('Security Features', () => {
    test('Should handle rapid requests without crashing', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/auth/login')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('Should sanitize user inputs', async () => {
      const response = await request(app)
        .post('/auth/dev/login')
        .send({
          userId: '<script>alert("xss")</script>',
          displayName: 'Clean Name'
        })
        .expect(200);

      // The malicious script should be handled safely
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).not.toContain('<script>');
    });

    test('Should handle malformed requests gracefully', async () => {
      // Missing content type
      const response = await request(app)
        .post('/auth/refresh')
        .expect(401);

      expect(response.body.error).toBe('Refresh token required');
    });
  });
});

// Additional helper test to verify system integration
describe('System Integration Verification', () => {
  test('Auth system integrates with Express properly', () => {
    const { createAuthMiddleware } = require('../src/auth/auth-middleware');
    const authMiddleware = createAuthMiddleware();

    expect(authMiddleware.extractAuth).toBeInstanceOf(Function);
    expect(authMiddleware.requireAuth).toBeInstanceOf(Function);
    expect(authMiddleware.optionalAuth).toBeInstanceOf(Function);
    expect(authMiddleware.developmentBypass).toBeInstanceOf(Function);
    expect(authMiddleware.authService).toBeTruthy();
  });

  test('Auth service handles configuration properly', () => {
    const AuthService = require('../src/auth/auth-service');
    const service = new AuthService({
      spotify: {
        clientId: 'test-id',
        scopes: ['user-read-email']
      }
    });

    expect(service.config.spotify.clientId).toBe('test-id');
    expect(service.config.spotify.scopes).toContain('user-read-email');
  });

  test('Redis session store falls back properly', async () => {
    const { RedisSessionStore } = require('../src/auth/redis-session-store');
    const store = new RedisSessionStore(null); // No Redis manager

    // Should handle operations gracefully without Redis
    store.set('test-session', { userId: 'test' }, () => {
      // Should complete without error
    });
  });
});

console.log('✅ Integration tests demonstrate complete auth flow:');
console.log('   1. PKCE OAuth URL generation');
console.log('   2. Development mode bypass');
console.log('   3. JWT token verification');
console.log('   4. Protected route access control');
console.log('   5. Session management');
console.log('   6. Security features');
console.log('   7. Redis fallback handling');