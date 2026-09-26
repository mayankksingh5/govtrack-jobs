import { Router } from 'express';
import { requireAuth, requireRole } from './auth-middleware.js';
import { getRecommendationDb } from './db.js';
import { ApiError, asyncRoute } from './middleware.js';

/*
  Editorial review for scraped records. Every scraped post starts as
  `pending`; an admin completes the details here and publishes or rejects it.
  Uses the service-role client because RLS hides non-published posts.
*/
const router = Router();
router.use(requireAuth, requireRole('admin'));

const STATUSES = ['pending', 'published', 'rejected'];
const TYPES = ['job', 'admit_card', 'result', 'answer_key', 'other'];
const FIELDS =
  'id, source_id, source_name, raw_title, url, type, status, slug, title, organization, post_name, short_info, apply_start, last_date, exam_date, total_vacancy, age_limit, qualification, fee_info, important_links, is_featured, first_seen_at, published_at, updated_at';

function assertResult(result) {
  if (!result.error) return result;
  const error = new Error(`Admin query failed: ${result.error.message}`);
  error.status = 500;
  error.code = 'ADMIN_DATABASE_ERROR';
  throw error;
}

function postId(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new ApiError(400, 'INVALID_POST_ID', 'A valid post ID is required');
  }
  return Number(value);
}

function text(value, name, max) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = String(value).trim();
  if (parsed.length > max) throw new ApiError(400, 'INVALID_INPUT', `${name} must be at most ${max} characters`);
  return parsed;
}

function date(value, name) {
  if (value == null || value === '') return null;
  const parsed = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) || Number.isNaN(new Date(`${parsed}T00:00:00Z`).valueOf())) {
    throw new ApiError(400, 'INVALID_INPUT', `${name} must be a YYYY-MM-DD date`);
  }
  return parsed;
}

function count(value, name) {
  if (value == null || value === '') return null;
  if (!/^\d+$/.test(String(value)) || Number(value) > 10_000_000) {
    throw new ApiError(400, 'INVALID_INPUT', `${name} must be a whole number`);
  }
  return Number(value);
}

function links(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new ApiError(400, 'INVALID_INPUT', 'important_links must be a list of up to 20 links');
  }
  return value
    .filter((link) => link && String(link.url || '').trim())
    .map((link) => {
      const url = String(link.url).trim();
      if (!/^https?:\/\/\S+$/i.test(url) || url.length > 1000) {
        throw new ApiError(400, 'INVALID_INPUT', `Invalid link URL: ${url.slice(0, 80)}`);
      }
      return { label: text(link.label, 'Link label', 80) || 'Official link', url };
    });
}

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

router.get(
  '/summary',
  asyncRoute(async (_req, res) => {
    const db = getRecommendationDb();
    const counts = await Promise.all(
      STATUSES.map((status) => db.from('posts').select('id', { count: 'exact', head: true }).eq('status', status))
    );
    counts.forEach(assertResult);
    const runs = assertResult(
      await db
        .from('scrape_runs')
        .select('source_id, ok, links_found, new_items, error, ms, ran_at')
        .order('ran_at', { ascending: false })
        .limit(200)
    ).data;
    // Latest run per source, for the crawler health panel.
    const latest = new Map();
    for (const run of runs || []) if (!latest.has(run.source_id)) latest.set(run.source_id, run);
    res.json({
      success: true,
      data: [{
        by_status: Object.fromEntries(STATUSES.map((status, index) => [status, counts[index].count || 0])),
        sources: [...latest.values()],
      }],
    });
  })
);

router.get(
  '/posts',
  asyncRoute(async (req, res) => {
    const status = STATUSES.includes(req.query.status) ? req.query.status : 'pending';
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10) || 20));
    const q = text(req.query.q, 'q', 100);
    const from = (page - 1) * limit;
    let query = getRecommendationDb()
      .from('posts')
      .select(FIELDS, { count: 'exact' })
      .eq('status', status)
      .order(status === 'published' ? 'published_at' : 'first_seen_at', { ascending: false, nullsFirst: false })
      .range(from, from + limit - 1);
    if (TYPES.includes(req.query.type)) query = query.eq('type', req.query.type);
    if (q) {
      const pattern = `*${q.replace(/[,()*]/g, ' ')}*`;
      query = query.or(`title.ilike.${pattern},raw_title.ilike.${pattern},source_name.ilike.${pattern},organization.ilike.${pattern}`);
    }
    const result = assertResult(await query);
    res.json({
      success: true,
      total: result.count || 0,
      page,
      pages: result.count ? Math.ceil(result.count / limit) : 0,
      data: result.data || [],
    });
  })
);

router.get(
  '/posts/:id',
  asyncRoute(async (req, res) => {
    const result = assertResult(
      await getRecommendationDb().from('posts').select(FIELDS).eq('id', postId(req.params.id)).maybeSingle()
    );
    if (!result.data) throw new ApiError(404, 'POST_NOT_FOUND', 'Post not found');
    res.json({ success: true, data: [result.data] });
  })
);

/* Quick status change from the review list (reject / back to pending) without
   touching the editorial fields. Publishing goes through PUT /posts/:id,
   which checks the details first. */
router.put(
  '/posts/:id/status',
  asyncRoute(async (req, res) => {
    const status = req.body?.status;
    if (!['pending', 'rejected'].includes(status)) {
      throw new ApiError(400, 'INVALID_INPUT', 'status must be pending or rejected');
    }
    const result = assertResult(
      await getRecommendationDb()
        .from('posts')
        .update({ status })
        .eq('id', postId(req.params.id))
        .select('id, status')
        .maybeSingle()
    );
    if (!result.data) throw new ApiError(404, 'POST_NOT_FOUND', 'Post not found');
    res.json({ success: true, data: [result.data] });
  })
);

router.put(
  '/posts/:id',
  asyncRoute(async (req, res) => {
    const id = postId(req.params.id);
    const db = getRecommendationDb();
    const current = assertResult(await db.from('posts').select('id, raw_title, slug, published_at').eq('id', id).maybeSingle()).data;
    if (!current) throw new ApiError(404, 'POST_NOT_FOUND', 'Post not found');

    const body = req.body || {};
    const status = body.status ?? 'pending';
    if (!STATUSES.includes(status)) throw new ApiError(400, 'INVALID_INPUT', `status must be one of: ${STATUSES.join(', ')}`);
    const type = body.type ?? 'job';
    if (!TYPES.includes(type)) throw new ApiError(400, 'INVALID_INPUT', `type must be one of: ${TYPES.join(', ')}`);

    const changes = {
      status,
      type,
      title: text(body.title, 'Title', 200),
      organization: text(body.organization, 'Organization', 120),
      post_name: text(body.post_name, 'Post name', 200),
      short_info: text(body.short_info, 'Short info', 500),
      apply_start: date(body.apply_start, 'Application start'),
      last_date: date(body.last_date, 'Last date'),
      exam_date: date(body.exam_date, 'Exam date'),
      total_vacancy: count(body.total_vacancy, 'Total vacancy'),
      age_limit: text(body.age_limit, 'Age limit', 120),
      qualification: text(body.qualification, 'Qualification', 300),
      fee_info: text(body.fee_info, 'Fee', 500),
      important_links: links(body.important_links),
      is_featured: body.is_featured === true,
    };

    if (status === 'published') {
      changes.title = changes.title || current.raw_title;
      if (!changes.important_links.length) {
        throw new ApiError(400, 'OFFICIAL_LINK_REQUIRED', 'Add at least one official link before publishing');
      }
      changes.published_at = current.published_at || new Date().toISOString();
      changes.slug = current.slug || `${slugify(changes.title)}-${id}`;
    }

    const result = assertResult(await db.from('posts').update(changes).eq('id', id).select(FIELDS).single());
    res.json({ success: true, data: [result.data] });
  })
);

export default router;
