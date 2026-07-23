const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

test.before(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create({
    instance: {
      startupTimeout: 120000 // 2 minutes to allow downloading in slower environments
    }
  });
  const mongoUri = mongoServer.getUri();
  
  // Set test environment variables BEFORE importing app
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'test_secret_for_jwt_signature_verification_321';
  process.env.PORT = 5001;
  
  // Import the Express app (which will now connect to the in-memory database)
  app = require('../src/app');
  
  // Wait a small buffer to ensure Mongoose finishes connection setup
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

test.after(async () => {
  // Clean up database connection and memory server
  await mongoose.connection.close();
  await mongoServer.stop();
});

test.describe('SafePass Auth API Security & Functional Suite', () => {
  const testUser = {
    email: 'testuser@example.com',
    password: 'Password123!'
  };

  test('POST /api/register - Successful registration with strong credentials', async () => {
    const res = await request(app)
      .post('/api/register')
      .send(testUser);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.message, 'User registered successfully');
    assert.strictEqual(res.body.passwordHash, undefined, 'Accidentally exposed password hash!');
  });

  test('POST /api/register - Refuse duplicate registration (Email in use)', async () => {
    const res = await request(app)
      .post('/api/register')
      .send(testUser);

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.error, 'Email already in use');
  });

  test('POST /api/register - Fail on invalid email structure', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        email: 'invalid-email',
        password: 'Password123!'
      });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, 'Invalid input');
  });

  test('POST /api/register - Fail on weak passwords (complexity validation)', async () => {
    const weakPasswords = [
      'short1!',      // < 8 chars
      'lowercase1!',   // No uppercase
      'UPPERCASE1!',   // No lowercase
      'NoSpecial123',  // No special char
      'NoNumbers!!'    // No numbers
    ];

    for (const pwd of weakPasswords) {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'validemail@example.com',
          password: pwd
        });

      assert.strictEqual(res.statusCode, 400, `Allowed weak password: ${pwd}`);
      assert.strictEqual(res.body.error, 'Invalid input');
    }
  });

  test('POST /api/login - Successful login and JWT generation', async () => {
    const res = await request(app)
      .post('/api/login')
      .send(testUser);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.token, 'Should return a login token');
    assert.strictEqual(typeof res.body.token, 'string');
  });

  test('POST /api/login - Fail login on incorrect password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword123!'
      });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Invalid credentials');
  });

  test('POST /api/login - Fail login on non-existent email', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'nobody@example.com',
        password: 'Password123!'
      });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Invalid credentials');
  });

  test('GET /api/protected - Authorize access with a valid token', async () => {
    // Perform login first to get the token
    const loginRes = await request(app)
      .post('/api/login')
      .send(testUser);

    const token = loginRes.body.token;

    // Use token in Authorization header
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Access granted to protected route');
    assert.ok(res.body.user.userId, 'Attached user ID should be present');
  });

  test('GET /api/protected - Block access with missing token', async () => {
    const res = await request(app)
      .get('/api/protected');

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Authentication required');
  });

  test('GET /api/protected - Block access with malformed token prefix', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Basic dummy_base64_token');

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Authentication required');
  });

  test('GET /api/protected - Block access with invalid/corrupted token signature', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer invalid_signature_token_here');

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.error, 'Unauthorized');
  });

  test('API Security Headers Verification (Helmet)', async () => {
    const res = await request(app).get('/api/protected');

    // Verify presence of Helmet headers
    assert.ok(res.headers['x-content-type-options'] === 'nosniff', 'Should protect against MIME sniffing');
    assert.ok(res.headers['x-frame-options'] === 'SAMEORIGIN', 'Should protect against clickjacking');
    
    // Verify removal of server fingerprinting
    assert.strictEqual(res.headers['x-powered-by'], undefined, 'Should strip X-Powered-By to prevent technology fingerprinting');
  });
});
