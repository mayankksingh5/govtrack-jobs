import { Router } from 'express';
import { getRecommendationDb } from './db.js';
import { ApiError, asyncRoute } from './middleware.js';
import {
  getCached,
  invalidateUserCache,
  rankJobs,
  setCached,
  similarJobs,
} from './recommendation-engine.js';
import { requireAuth, requireRole } from './auth-middleware.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set(['job', 'admit_card', 'result', 'answer_key', 'other']);
const JOB_FIELDS =
  'id, source_id, source_name, title, raw_title, slug, organization, post_name, short_info, type, apply_start, last_date, exam_date, total_vacancy, age_limit, qualification, fee_info, important_links, published_at, updated_at';

function userId(req, required = true) {
  const value = String(req.get('x-user-id') || '').trim();
  if (!value && !required) return null;
  if (!UUID.test(value)) {
    throw new ApiError(400, 'INVALID_USER_ID', 'X-User-ID must be a valid UUID');
  }
  return value;
}

function integer(value, name, fallback, max = 100) {
  if (value == null || value === '') {
    if (fallback == null) throw new ApiError(400, 'INVALID_INPUT', `${name} is required`);
    return fallback;
  }
  if (!/^\d+$/.test(String(value))) throw new ApiError(400, 'INVALID_INPUT', `${name} must be an integer`);
  const parsed = Number(value);
  if (parsed < 1 || parsed > max) throw new ApiError(400, 'INVALID_INPUT', `${name} must be between 1 and ${max}`);
  return parsed;
}

function text(value, name, max = 120) {
  if (value == null || value === '') return null;
  const parsed = String(value).trim();
  if (parsed.length > max) throw new ApiError(400, 'INVALID_INPUT', `${name} is too long`);
  return parsed;
}

function array(value, name) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== 'string' || item.trim().length > 120)) {
    throw new ApiError(400, 'INVALID_INPUT', `${name} must be an array of up to 30 short strings`);
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function respond(res, data, total, page, limit, meta = {}) {
  res.json({
    success: true,
    total,
    page,
    pages: total ? Math.ceil(total / limit) : 0,
    data,
    meta,
  });
}

function assertResult(result) {
  if (!result.error) return result;
  const error = new Error(`Recommendation query failed: ${result.error.message}`);
  error.status = 500;
  error.code = 'RECOMMENDATION_DATABASE_ERROR';
  throw error;
}

async function preferencesFor(db, id) {
  const result = assertResult(
    await db.from('job_user_preferences').select('*').eq('user_id', id).maybeSingle()
  );
  return result.data || {};
}

async function historyFor(db, id) {
  const result = assertResult(
    await db
      .from('job_interactions')
      .select('interaction, posts(organization, source_name, type)')
      .eq('user_id', id)
      .order('occurred_at', { ascending: false })
      .limit(200)
  );
  return (result.data || []).map((entry) => ({
    interaction: entry.interaction,
    organization: entry.posts?.organization || entry.posts?.source_name,
    category: entry.posts?.type,
  }));
}

async function candidateJobs(db, filters = {}) {
  let query = db
    .from('posts')
    .select(JOB_FIELDS)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(500);
  if (filters.category) query = query.eq('type', filters.category);
  if (filters.organization) query = query.ilike('organization', `%${filters.organization}%`);
  if (filters.qualification) query = query.ilike('qualification', `%${filters.qualification}%`);
  return assertResult(await query).data || [];
}

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const id = userId(req);
    const page = integer(req.query.page, 'page', 1, 10_000);
    const limit = integer(req.query.limit, 'limit', 20, 100);
    const mode = text(req.query.mode, 'mode', 30) || 'personalized';
    if (!['personalized', 'trending', 'recent', 'expiring'].includes(mode)) {
      throw new ApiError(400, 'INVALID_INPUT', 'mode must be personalized, trending, recent, or expiring');
    }
    const category = text(req.query.category, 'category', 30);
    if (category && !CATEGORIES.has(category)) throw new ApiError(400, 'INVALID_INPUT', 'Invalid category');
    const filters = {
      category,
      organization: text(req.query.organization, 'organization'),
      qualification: text(req.query.qualification, 'qualification', 180),
    };
    const cacheKey = `${id}:${mode}:${page}:${limit}:${JSON.stringify(filters)}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const db = getRecommendationDb();
    let jobs = await candidateJobs(db, filters);
    let ranked;
    if (mode === 'personalized') {
      const [preferences, history] = await Promise.all([
        preferencesFor(db, id),
        historyFor(db, id),
      ]);
      ranked = rankJobs(jobs, preferences, history);
    } else if (mode === 'expiring') {
      const now = Date.now();
      ranked = jobs
        .filter((job) => {
          const deadline = new Date(job.last_date).getTime();
          return Number.isFinite(deadline) && deadline >= now && deadline <= now + 30 * 86_400_000;
        })
        .sort((a, b) => new Date(a.last_date) - new Date(b.last_date));
    } else if (mode === 'trending') {
      const interactions = assertResult(
        await db
          .from('job_interactions')
          .select('job_id, interaction')
          .gte('occurred_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
          .limit(5000)
      ).data || [];
      const popularity = new Map();
      interactions.forEach((entry) =>
        popularity.set(
          entry.job_id,
          (popularity.get(entry.job_id) || 0) + (entry.interaction === 'saved' ? 3 : 1)
        )
      );
      ranked = jobs
        .map((job) => ({ ...job, trend_score: popularity.get(job.id) || 0 }))
        .sort((a, b) => b.trend_score - a.trend_score || new Date(b.published_at) - new Date(a.published_at));
    } else {
      ranked = jobs;
    }

    const total = ranked.length;
    const data = ranked.slice((page - 1) * limit, page * limit);
    const payload = {
      success: true,
      total,
      page,
      pages: total ? Math.ceil(total / limit) : 0,
      data,
      meta: { mode, cache_ttl_seconds: 300 },
    };
    setCached(cacheKey, payload);
    res.json(payload);
  })
);

router.get(
  '/similar/:jobId',
  asyncRoute(async (req, res) => {
    const jobId = integer(req.params.jobId, 'jobId', null, Number.MAX_SAFE_INTEGER);
    const page = integer(req.query.page, 'page', 1, 10_000);
    const limit = integer(req.query.limit, 'limit', 6, 50);
    const db = getRecommendationDb();
    const target = assertResult(
      await db.from('posts').select(JOB_FIELDS).eq('id', jobId).eq('status', 'published').maybeSingle()
    ).data;
    if (!target) throw new ApiError(404, 'JOB_NOT_FOUND', 'Job not found');
    const ranked = similarJobs(target, await candidateJobs(db, {}));
    respond(res, ranked.slice((page - 1) * limit, page * limit), ranked.length, page, limit, {
      based_on_job_id: jobId,
    });
  })
);

export async function savePreferences(req, res) {
    const id = userId(req);
    const experience = req.body.experience_years;
    if (experience != null && (!Number.isInteger(experience) || experience < 0 || experience > 80)) {
      throw new ApiError(400, 'INVALID_INPUT', 'experience_years must be an integer between 0 and 80');
    }
    const min = req.body.preferred_salary_min;
    const max = req.body.preferred_salary_max;
    if ((min != null && (typeof min !== 'number' || min < 0)) || (max != null && (typeof max !== 'number' || max < 0)) || (min != null && max != null && min > max)) {
      throw new ApiError(400, 'INVALID_INPUT', 'Preferred salary range is invalid');
    }
    const record = {
      user_id: id,
      qualification: text(req.body.qualification, 'qualification', 180),
      skills: array(req.body.skills, 'skills'),
      experience_years: experience ?? null,
      preferred_states: array(req.body.preferred_states, 'preferred_states'),
      preferred_organizations: array(req.body.preferred_organizations, 'preferred_organizations'),
      preferred_categories: array(req.body.preferred_categories, 'preferred_categories'),
      preferred_salary_min: min ?? null,
      preferred_salary_max: max ?? null,
      updated_at: new Date().toISOString(),
    };
    const result = assertResult(
      await getRecommendationDb()
        .from('job_user_preferences')
        .upsert(record, { onConflict: 'user_id' })
        .select()
        .single()
    );
    invalidateUserCache(id);
    respond(res, [result.data], 1, 1, 1);
}

router.post(
  '/interactions',
  asyncRoute(async (req, res) => {
    const id = userId(req);
    const jobId = integer(req.body.job_id, 'job_id', null, Number.MAX_SAFE_INTEGER);
    if (!['viewed', 'saved'].includes(req.body.interaction)) {
      throw new ApiError(400, 'INVALID_INPUT', 'interaction must be viewed or saved');
    }
    const record = { user_id: id, job_id: jobId, interaction: req.body.interaction };
    if (req.body.interaction === 'saved') {
      const existing = assertResult(
        await getRecommendationDb()
          .from('job_interactions')
          .select('id')
          .eq('user_id', id)
          .eq('job_id', jobId)
          .eq('interaction', 'saved')
          .maybeSingle()
      ).data;
      if (!existing) {
        assertResult(await getRecommendationDb().from('job_interactions').insert(record));
      }
    } else {
      assertResult(await getRecommendationDb().from('job_interactions').insert(record));
    }
    invalidateUserCache(id);
    respond(res, [record], 1, 1, 1);
  })
);

router.get(
  '/analytics',
  requireAuth,
  requireRole('admin'),
  asyncRoute(async (_req, res) => {
    const db = getRecommendationDb();
    const interactions = assertResult(
      await db
        .from('job_interactions')
        .select('job_id, interaction, posts(id, title, raw_title, organization, source_name, type)')
        .limit(10_000)
    ).data || [];
    const aggregate = (filter, key) => {
      const counts = new Map();
      interactions.filter(filter).forEach((entry) => {
        const value = key(entry);
        if (value) counts.set(value, (counts.get(value) || 0) + 1);
      });
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({ label, count }));
    };
    respond(
      res,
      [{
        most_viewed_jobs: aggregate((entry) => entry.interaction === 'viewed', (entry) => entry.posts?.title || entry.posts?.raw_title),
        most_saved_jobs: aggregate((entry) => entry.interaction === 'saved', (entry) => entry.posts?.title || entry.posts?.raw_title),
        top_categories: aggregate(() => true, (entry) => entry.posts?.type),
        top_organizations: aggregate(() => true, (entry) => entry.posts?.organization || entry.posts?.source_name),
      }],
      1,
      1,
      1
    );
  })
);

export default router;
