import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Session } from '../src/models/Session';
import { hashPassword, hashToken } from '../src/utils/crypto';
import { UserRole } from '../src/types/roles';

const app = createApp();

describe('Authentication & Password Recovery Endpoints', () => {
  beforeEach(async () => {
    // Create initial user
    await User.create({
      name: 'Test Administrator',
      email: 'admin@supermarket.local',
      passwordHash: await hashPassword('AdminPass123!'),
      role: UserRole.ADMIN,
      status: 'active'
    });
  });

  it('POST /api/v1/auth/login - should authenticate valid user and set cookies', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@supermarket.local', password: 'AdminPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('admin@supermarket.local');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.csrfToken).toBeDefined();

    // Verify cookies set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('access_token'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('refresh_token'))).toBe(true);
  });

  it('POST /api/v1/auth/login - should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@supermarket.local', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/csrf - should return fresh CSRF token', async () => {
    const res = await request(app).get('/api/v1/auth/csrf');
    expect(res.status).toBe(200);
    expect(res.body.data.csrfToken).toBeDefined();
  });

  it('POST /api/v1/auth/forgot-password - should return identical generic message for existing and non-existing email', async () => {
    const resExisting = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'admin@supermarket.local' });

    const resNonExisting = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@supermarket.local' });

    expect(resExisting.status).toBe(200);
    expect(resNonExisting.status).toBe(200);
    expect(resExisting.body.data.message).toBe(resNonExisting.body.data.message);

    // Verify token was hashed in DB
    const userInDb = await User.findOne({ email: 'admin@supermarket.local' }).select('+resetPasswordTokenHash +resetPasswordExpires');
    expect(userInDb?.resetPasswordTokenHash).toBeDefined();
    expect(userInDb?.resetPasswordExpires).toBeDefined();
  });

  it('POST /api/v1/auth/reset-password - should reset password and invalidate previous sessions', async () => {
    // 1. Establish an active session
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@supermarket.local', password: 'AdminPass123!' });
    const accessToken = loginRes.body.data.accessToken;

    // Verify active session in DB
    const activeSessionsBefore = await Session.countDocuments({ isRevoked: false });
    expect(activeSessionsBefore).toBeGreaterThan(0);

    // 2. Set reset token manually on user
    const rawToken = 'sample_secure_random_reset_token_32chars';
    const hashed = hashToken(rawToken);
    await User.findOneAndUpdate(
      { email: 'admin@supermarket.local' },
      {
        resetPasswordTokenHash: hashed,
        resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000)
      }
    );

    // 3. Submit reset-password request
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'BrandNewSecurePassword123!'
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 4. Verify token was cleared (single-use)
    const userAfter = await User.findOne({ email: 'admin@supermarket.local' }).select('+resetPasswordTokenHash');
    expect(userAfter?.resetPasswordTokenHash).toBeUndefined();

    // 5. Verify sessions were revoked
    const activeSessionsAfter = await Session.countDocuments({ isRevoked: false });
    expect(activeSessionsAfter).toBe(0);

    // 6. Old password fails
    const oldLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@supermarket.local', password: 'AdminPass123!' });
    expect(oldLoginRes.status).toBe(401);

    // 7. New password succeeds
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@supermarket.local', password: 'BrandNewSecurePassword123!' });
    expect(newLoginRes.status).toBe(200);

    // 8. Token cannot be reused a second time
    const reuseRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'YetAnotherPassword123!'
      });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/reset-password - should reject expired reset token', async () => {
    const rawToken = 'expired_reset_token_sample_32chars_test';
    const hashed = hashToken(rawToken);
    await User.findOneAndUpdate(
      { email: 'admin@supermarket.local' },
      {
        resetPasswordTokenHash: hashed,
        resetPasswordExpires: new Date(Date.now() - 5000) // Expired 5 seconds ago
      }
    );

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'BrandNewSecurePassword123!'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Invalid or expired password reset token');
  });
});
