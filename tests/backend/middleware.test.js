import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  ApiError,
  asyncRoute,
  errorHandler,
  notFoundHandler,
  validateId,
  validateListQuery,
  validateSearchQuery,
} from '../../api/middleware.js';

function app() {
  const instance = express();
  instance.get('/list', validateListQuery, (req, res) => res.json(req.validated));
  instance.get('/search', validateSearchQuery, (req, res) => res.json(req.validated));
  instance.get('/id/:id', validateId, (req, res) => res.json(req.validated));
  instance.get(
    '/explode',
    asyncRoute(async () => {
      throw new Error('private failure');
    })
  );
  instance.get('/known', (_req, _res, next) => next(new ApiError(418, 'TEAPOT', 'Short and stout')));
  instance.use(notFoundHandler);
  instance.use(errorHandler);
  return instance;
}

describe('API validation and errors', () => {
  it('accepts valid pagination and filters', async () => {
    const response = await request(app()).get(
      '/list?page=2&limit=10&sort=newest&category=job&organization=ISRO&qualification=B.Tech'
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 2, limit: 10, category: 'job' });
  });

  it.each([
    ['/list?page=x', 'page must be an integer'],
    ['/list?limit=101', 'limit must be between 1 and 100'],
    ['/list?sort=oldest', 'sort must be newest'],
    ['/list?category=unknown', 'category must be one of'],
    [`/list?organization=${'x'.repeat(121)}`, 'organization must be at most'],
  ])('rejects invalid list input %s', async (url, message) => {
    const response = await request(app()).get(url);
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain(message);
  });

  it('validates search terms and paging', async () => {
    expect((await request(app()).get('/search')).status).toBe(400);
    expect((await request(app()).get('/search?q=ISRO,drop')).status).toBe(400);
    const response = await request(app()).get('/search?q=ISRO Engineer&page=2&limit=5');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ q: 'ISRO Engineer', page: 2, limit: 5 });
  });

  it('validates numeric IDs', async () => {
    expect((await request(app()).get('/id/nope')).status).toBe(400);
    expect((await request(app()).get('/id/42')).body.id).toBe(42);
  });

  it('returns safe 404, known errors, and hidden 500 errors', async () => {
    const missing = await request(app()).get('/missing');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('ROUTE_NOT_FOUND');
    const known = await request(app()).get('/known');
    expect(known.status).toBe(418);
    expect(known.body.error.code).toBe('TEAPOT');
    const failed = await request(app()).get('/explode');
    expect(failed.status).toBe(500);
    expect(failed.body.error.message).toBe('Internal server error');
  });
});
