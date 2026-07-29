import { Router } from 'express';
import { getDb, logDatabaseError } from './db.js';
import {
  ApiError,
  asyncRoute,
  validateId,
  validateListQuery,
  validateSearchQuery,
} from './middleware.js';

const router = Router();
const PUBLIC_FIELDS =
  'id, source_id, source_name, title, raw_title, slug, organization, post_name, short_info, type, apply_start, last_date, exam_date, total_vacancy, age_limit, qualification, fee_info, important_links, published_at, updated_at';

const response = (res, { data = [], total = 0, page = 1, limit = 20 }) =>
  res.json({
    success: true,
    total,
    page,
    pages: total ? Math.ceil(total / limit) : 0,
    data,
  });

function assertDbResult(error, context = {}) {
  if (!error) return;
  logDatabaseError(context, error);
  const apiError = new Error(`Database query failed: ${error.message}`);
  apiError.status = 500;
  apiError.code = 'DATABASE_ERROR';
  throw apiError;
}

router.get(
  '/jobs',
  validateListQuery,
  asyncRoute(async (req, res) => {
    const { page, limit, category, organization, qualification } = req.validated;
    const from = (page - 1) * limit;
    let query = getDb()
      .from('posts')
      .select(PUBLIC_FIELDS, { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(from, from + limit - 1);

    if (organization) query = query.ilike('organization', `%${organization}%`);
    if (category) query = query.eq('type', category);
    if (qualification) query = query.ilike('qualification', `%${qualification}%`);

    const { data, count, error } = await query;
    assertDbResult(error, {
      table: 'posts',
      operation: 'list_jobs',
      route: 'GET /api/jobs',
      filters: { category, organization, qualification, status: 'published' },
      select: PUBLIC_FIELDS,
      order: ['published_at desc nulls last', 'id desc'],
      range: { from, to: from + limit - 1 },
    });
    response(res, { data: data || [], total: count || 0, page, limit });
  })
);

router.get(
  '/jobs/:id',
  validateId,
  asyncRoute(async (req, res) => {
    const { data, error } = await getDb()
      .from('posts')
      .select(PUBLIC_FIELDS)
      .eq('id', req.validated.id)
      .eq('status', 'published')
      .maybeSingle();
    assertDbResult(error, {
      table: 'posts',
      operation: 'get_job',
      route: 'GET /api/jobs/:id',
      filters: { id: req.validated.id, status: 'published' },
      select: PUBLIC_FIELDS,
    });
    if (!data) throw new ApiError(404, 'JOB_NOT_FOUND', 'Job not found');
    response(res, { data: [data], total: 1, page: 1, limit: 1 });
  })
);

router.get(
  '/search',
  validateSearchQuery,
  asyncRoute(async (req, res) => {
    const { q, page, limit } = req.validated;
    const from = (page - 1) * limit;
    const pattern = `*${q}*`;
    const { data, count, error } = await getDb()
      .from('posts')
      .select(PUBLIC_FIELDS, { count: 'exact' })
      .eq('status', 'published')
      .or(
        `title.ilike.${pattern},raw_title.ilike.${pattern},organization.ilike.${pattern},post_name.ilike.${pattern}`
      )
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, from + limit - 1);
    assertDbResult(error, {
      table: 'posts',
      operation: 'search_jobs',
      route: 'GET /api/search',
      filters: { q, status: 'published' },
      select: PUBLIC_FIELDS,
      order: ['published_at desc nulls last'],
      range: { from, to: from + limit - 1 },
    });
    response(res, { data: data || [], total: count || 0, page, limit });
  })
);

router.get(
  '/latest',
  validateListQuery,
  asyncRoute(async (req, res) => {
    const limit = Math.min(req.validated.limit, 50);
    const { data, count, error } = await getDb()
      .from('posts')
      .select(PUBLIC_FIELDS, { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(limit);
    assertDbResult(error, {
      table: 'posts',
      operation: 'latest_jobs',
      route: 'GET /api/latest',
      filters: { status: 'published' },
      select: PUBLIC_FIELDS,
      order: ['published_at desc nulls last', 'id desc'],
      range: { limit },
    });
    response(res, { data: data || [], total: count || 0, page: 1, limit });
  })
);

router.get(
  '/statistics',
  asyncRoute(async (_req, res) => {
    const categories = ['job', 'admit_card', 'result', 'answer_key', 'other'];
    const queries = [
      getDb().from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      ...categories.map((category) =>
        getDb()
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .eq('type', category)
      ),
    ];
    const results = await Promise.all(queries);
    for (const [index, result] of results.entries()) {
      assertDbResult(result.error, {
        table: 'posts',
        operation: index === 0 ? 'statistics_total' : 'statistics_by_category',
        route: 'GET /api/statistics',
        filters: {
          status: 'published',
          category: index === 0 ? null : categories[index - 1],
        },
        select: 'id',
      });
    }

    const total = results[0].count || 0;
    const byCategory = Object.fromEntries(
      categories.map((category, index) => [category, results[index + 1].count || 0])
    );
    response(res, {
      data: [{ published_jobs: total, by_category: byCategory }],
      total,
      page: 1,
      limit: total || 1,
    });
  })
);

export default router;
