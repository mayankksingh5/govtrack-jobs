import { Router } from 'express';
import { requireAuth } from './auth-middleware.js';
import { getRecommendationDb } from './db.js';
import { ApiError, asyncRoute } from './middleware.js';

const router = Router();
const PROFILE_FIELDS =
  'user_id, name, email, avatar_url, qualification, skills, preferred_states, preferred_organizations, role, created_at, updated_at';
const JOB_FIELDS =
  'id, source_id, source_name, title, raw_title, slug, organization, post_name, short_info, type, apply_start, last_date, exam_date, total_vacancy, age_limit, qualification, fee_info, important_links, published_at, updated_at';

function text(value, name, max = 180, nullable = true) {
  if (value == null || String(value).trim() === '') {
    if (nullable) return null;
    throw new ApiError(400, 'INVALID_INPUT', `${name} is required`);
  }
  const parsed = String(value).trim();
  if (parsed.length > max) throw new ApiError(400, 'INVALID_INPUT', `${name} is too long`);
  return parsed;
}

function list(value, name) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== 'string' || item.trim().length > 120)) {
    throw new ApiError(400, 'INVALID_INPUT', `${name} must contain up to 30 short strings`);
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function jobId(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new ApiError(400, 'INVALID_JOB_ID', 'A valid job ID is required');
  }
  return Number(value);
}

function assertResult(result) {
  if (!result.error) return result;
  const error = new Error(`User query failed: ${result.error.message}`);
  error.status = 500;
  error.code = 'USER_DATABASE_ERROR';
  throw error;
}

router.get(
  '/profile',
  requireAuth,
  asyncRoute(async (req, res) => {
    const result = assertResult(
      await getRecommendationDb()
        .from('user_profiles')
        .select(PROFILE_FIELDS)
        .eq('user_id', req.auth.user.id)
        .maybeSingle()
    );
    if (!result.data) throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Profile not found');
    res.json({ success: true, data: [result.data] });
  })
);

router.put(
  '/profile',
  requireAuth,
  asyncRoute(async (req, res) => {
    const avatar = text(req.body.avatar_url, 'avatar_url', 500);
    if (avatar && !/^https:\/\//i.test(avatar)) {
      throw new ApiError(400, 'INVALID_INPUT', 'avatar_url must use HTTPS');
    }
    const profile = {
      user_id: req.auth.user.id,
      email: req.auth.user.email,
      name: text(req.body.name, 'name', 100, false),
      avatar_url: avatar,
      qualification: text(req.body.qualification, 'qualification'),
      skills: list(req.body.skills, 'skills'),
      preferred_states: list(req.body.preferred_states, 'preferred_states'),
      preferred_organizations: list(req.body.preferred_organizations, 'preferred_organizations'),
      updated_at: new Date().toISOString(),
    };
    const result = assertResult(
      await getRecommendationDb()
        .from('user_profiles')
        .upsert(profile, { onConflict: 'user_id' })
        .select(PROFILE_FIELDS)
        .single()
    );

    // Keep the existing recommendation preference record aligned without
    // changing the recommendation engine or its schema.
    assertResult(
      await getRecommendationDb().from('job_user_preferences').upsert(
        {
          user_id: req.auth.user.id,
          qualification: profile.qualification,
          skills: profile.skills,
          preferred_states: profile.preferred_states,
          preferred_organizations: profile.preferred_organizations,
          updated_at: profile.updated_at,
        },
        { onConflict: 'user_id' }
      )
    );
    res.json({ success: true, data: [result.data] });
  })
);

router.post(
  '/user/jobs/:jobId/:activity',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = jobId(req.params.jobId);
    const activity = req.params.activity;
    if (!['saved', 'viewed', 'applied'].includes(activity)) {
      throw new ApiError(400, 'INVALID_ACTIVITY', 'Activity must be saved, viewed, or applied');
    }
    const db = getRecommendationDb();
    const job = assertResult(
      await db.from('posts').select('id').eq('id', id).eq('status', 'published').maybeSingle()
    ).data;
    if (!job) throw new ApiError(404, 'JOB_NOT_FOUND', 'Job not found');
    const timestamp = new Date().toISOString();
    assertResult(
      await db.from('user_job_activity').upsert(
        {
          user_id: req.auth.user.id,
          job_id: id,
          activity,
          updated_at: timestamp,
        },
        { onConflict: 'user_id,job_id,activity' }
      )
    );
    if (activity === 'saved' || activity === 'viewed') {
      const interaction = activity === 'saved' ? 'saved' : 'viewed';
      if (interaction === 'saved') {
        const existing = assertResult(
          await db.from('job_interactions').select('id').eq('user_id', req.auth.user.id).eq('job_id', id).eq('interaction', 'saved').maybeSingle()
        ).data;
        if (!existing) assertResult(await db.from('job_interactions').insert({ user_id: req.auth.user.id, job_id: id, interaction }));
      } else {
        assertResult(await db.from('job_interactions').insert({ user_id: req.auth.user.id, job_id: id, interaction }));
      }
    }
    res.status(201).json({ success: true, data: [{ job_id: id, activity, updated_at: timestamp }] });
  })
);

router.delete(
  '/user/jobs/:jobId/saved',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = jobId(req.params.jobId);
    const db = getRecommendationDb();
    assertResult(
      await db.from('user_job_activity').delete().eq('user_id', req.auth.user.id).eq('job_id', id).eq('activity', 'saved')
    );
    assertResult(
      await db.from('job_interactions').delete().eq('user_id', req.auth.user.id).eq('job_id', id).eq('interaction', 'saved')
    );
    res.json({ success: true, data: [{ job_id: id, saved: false }] });
  })
);

for (const [path, activity] of [
  ['/user/jobs/saved', 'saved'],
  ['/user/jobs/recent', 'viewed'],
  ['/user/jobs/applied', 'applied'],
]) {
  router.get(
    path,
    requireAuth,
    asyncRoute(async (req, res) => {
      const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
      const from = (page - 1) * limit;
      const result = assertResult(
        await getRecommendationDb()
          .from('user_job_activity')
          .select(`job_id, updated_at, posts(${JOB_FIELDS})`, { count: 'exact' })
          .eq('user_id', req.auth.user.id)
          .eq('activity', activity)
          .order('updated_at', { ascending: false })
          .range(from, from + limit - 1)
      );
      const data = (result.data || []).map((entry) => ({
        ...entry.posts,
        activity_updated_at: entry.updated_at,
      }));
      res.json({
        success: true,
        total: result.count || 0,
        page,
        pages: result.count ? Math.ceil(result.count / limit) : 0,
        data,
      });
    })
  );
}

export default router;
