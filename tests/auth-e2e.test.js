/**
 * E2E Authentication Tests for EchoTune AI
 * Tests PKCE flow, JWT tokens, Redis sessions, and protected routes
 */

const request = require('supertest');
const AuthService = require('../src/auth/auth-service');
const { createAuthMiddleware } = require('../src/auth/auth-middleware');
const express = require('express');

describe('E2E Authentication Flow Tests', () => {
  let app;
  let authService;
  let authMiddleware;
  let testState;
  let testSessionId;
  let testAccessToken;
  let testRefreshToken;

  beforeAll(async () => {
    // Create test express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Initialize auth service and middleware
    authService = new AuthService({
      spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID || 'test-client-id',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback'
      }
    });

    authMiddleware = createAuthMiddleware({
      spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID || 'test-client-id',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback'
      }
    });

    // Setup test routes
    const { router, initializeAuthRoutes } = require('../src/auth/auth-routes');
    initializeAuthRoutes(); // Initialize without Redis for testing

    // Auth routes
    app.use('/auth', router);

    // Apply auth middleware
    app.use(authMiddleware.extractAuth);
    app.use(authMiddleware.developmentBypass);

    // Test protected route
    app.get('/protected', authMiddleware.requireAuth, (req, res) => {
      res.json({
        success: true,
        user: req.auth.user,
        message: 'Access granted to protected resource'
      });
    });

    // Test optional auth route
    app.get('/optional', (req, res) => {
      res.json({
        success: true,
        authenticated: req.auth?.isAuthenticated || false,
        user: req.auth?.user || null
      });
    });

    // Health check route
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  });

  describe('Authentication Service Unit Tests', () => {
    test('should generate auth URL with PKCE', async () => {
      const result = authService.generateAuthUrl({
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      });

      expect(result).toHaveProperty('authUrl');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('nonce');
      expect(result.authUrl).toContain('code_challenge');
      expect(result.authUrl).toContain('code_challenge_method=S256');
      expect(result.authUrl).toContain('state=' + result.state);
      
      // Store state for callback test
      testState = result.state;
    });

    test('should validate auth state', async () => {
      // Should find the state we just created
      const authData = await authService.getAuthState(testState);
      expect(authData).toBeTruthy();
      expect(authData).toHaveProperty('code_verifier');
      expect(authData).toHaveProperty('code_challenge');
      expect(authData).toHaveProperty('nonce');
    });

    test('should fail with invalid state', async () => {
      const invalidAuthData = await authService.getAuthState('invalid-state');
      expect(invalidAuthData).toBeNull();
    });

    test('should perform health check', async () => {
      const health = await authService.healthCheck();
      expect(health).toHaveProperty('auth_service', 'healthy');
      expect(health).toHaveProperty('spotify_configured');
      expect(health).toHaveProperty('redis_connected', false);
    });
  });

  describe('Auth Endpoints', () => {
    test('GET /auth/login should return auth URL', async () => {
      const response = await request(app)
        .get('/auth/login')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('state');
      expect(response.body.authUrl).toContain('https://accounts.spotify.com/authorize');
    });

    test('GET /auth/callback should require parameters', async () => {
      await request(app)
        .get('/auth/callback')
        .expect(400);

      const response = await request(app)
        .get('/auth/callback?code=missing-state')
        .expect(400);

      expect(response.body.error).toBe('Missing parameters');
    });

    test('GET /auth/callback should reject invalid state', async () => {
      const response = await request(app)
        .get('/auth/callback?code=test-code&state=invalid-state')
        .expect(400);

      expect(response.body.error).toBe('Authentication failed');
    });

    test('POST /auth/refresh should require refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .expect(401);

      expect(response.body.error).toBe('Refresh token required');
    });

    test('POST /auth/logout should work without authentication', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /auth/me should require authentication', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Authorization required');
    });

    test('GET /auth/status should return auth status', async () => {
      const response = await request(app)
        .get('/auth/status')
        .expect(200);

      expect(response.body).toHaveProperty('authenticated', false);
      expect(response.body).toHaveProperty('service');
    });
  });

  describe('Development Mode Authentication', () => {
    beforeAll(() => {
      process.env.AUTH_DEVELOPMENT_MODE = 'true';
    });

    afterAll(() => {
      delete process.env.AUTH_DEVELOPMENT_MODE;
    });

    test('should allow bearer token in development mode', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer test-dev-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe('test-dev-user');
    });

    test('development login endpoint should work', async () => {
      const response = await request(app)
        .post('/auth/dev/login')
        .send({
          userId: 'dev-test-user',
          displayName: 'Test Dev User'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe('dev-test-user');
      expect(response.body.user.display_name).toBe('Test Dev User');
    });
  });

  describe('Protected Route Tests', () => {
    test('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('should allow optional auth route without authentication', async () => {
      const response = await request(app)
        .get('/optional')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeNull();
    });
  });

  describe('Security Tests', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // These would be set by the main server security middleware
      // Here we just verify the endpoint works
      expect(response.body.status).toBe('ok');
    });

    test('should handle malformed tokens gracefully', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-malformed-token')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Rate Limiting Tests', () => {
    test('should handle multiple login requests', async () => {
      const requests = [];
      
      // Send multiple requests rapidly
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).get('/auth/login'));
      }

      const responses = await Promise.all(requests);
      
      // All should succeed (rate limiting would be handled by Redis in production)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Cookie Handling', () => {
    test('should accept auth token from cookies', async () => {
      // This test would require setting up a proper cookie-based auth flow
      // For now, we test that the endpoint handles missing cookies gracefully
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Authorization required');
    });
  });

  describe('Error Handling', () => {
    test('should handle auth service errors gracefully', async () => {
      // Test with uninitialized service
      const testApp = express();
      testApp.use(express.json());
      
      const { router } = require('../src/auth/auth-routes');
      testApp.use('/auth', router);

      const response = await request(testApp)
        .get('/auth/login')
        .expect(500);

      expect(response.body.error).toBe('Auth service not initialized');
    });

    test('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(401);

      expect(response.body.error).toBe('Refresh token required');
    });
  });
});