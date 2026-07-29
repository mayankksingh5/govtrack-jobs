import request from 'supertest';
import { describe, expect, it } from 'vitest';
import defaultApp, { createApp } from '../../api/app.js';

describe('real API application contracts', () => {
  const app = createApp();

  it('exports a valid Express handler for Vercel', () => {
    expect(typeof defaultApp).toBe('function');
    expect(typeof defaultApp.handle).toBe('function');
  });

  it('returns health and a structured 404', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({ success: true, total: 1, page: 1, pages: 1 });
    expect((await request(app).get('/not-found')).status).toBe(404);
  });

  it('validates search, pagination, filtering, and job IDs before database access', async () => {
    expect((await request(app).get('/api/search')).status).toBe(400);
    expect((await request(app).get('/api/jobs?page=0')).status).toBe(400);
    expect((await request(app).get('/api/jobs?category=invalid')).status).toBe(400);
    expect((await request(app).get('/api/jobs/not-a-number')).status).toBe(400);
  });

  it('protects profile, saved jobs, applied jobs, and admin analytics', async () => {
    for (const path of [
      '/api/profile',
      '/api/user/jobs/saved',
      '/api/user/jobs/recent',
      '/api/user/jobs/applied',
      '/api/recommendations/analytics',
    ]) {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('validates authentication and recommendation requests', async () => {
    expect(
      (await request(app).post('/api/auth/register').send({ email: 'bad' })).status
    ).toBe(400);
    const login = await request(app).post('/api/auth/login').send({ email: 'bad' });
    expect(login.status).toBe(500);
    expect(login.body.error.code).toBe('AUTH_CONFIGURATION_ERROR');
    expect((await request(app).post('/api/auth/reset-password').send({})).status).toBe(400);
    expect((await request(app).get('/api/recommendations')).status).toBe(400);
    expect((await request(app).get('/api/recommendations/similar/nope')).status).toBe(400);
  });
});
