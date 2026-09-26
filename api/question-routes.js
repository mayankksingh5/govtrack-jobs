import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getRecommendationDb } from './db.js';
import { ApiError, asyncRoute, validateId } from './middleware.js';

/*
  Public Q&A on job pages. Anyone can ask (no account); questions stay
  `pending` until an admin approves them, and only approved ones are returned.
*/
const router = Router();
const FIELDS = 'id, name, message, answer, created_at, answered_at';

// PostgREST codes for "table does not exist" (migration not run yet).
export const isMissingTable = (error) => ['42P01', 'PGRST205'].includes(error?.code);

const askLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'QUESTION_RATE_LIMIT', message: 'Too many questions from this device. Please try again later.' },
  },
});

// Collapse whitespace and drop control characters.
const clean = (value) => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

router.get(
  '/jobs/:id/questions',
  validateId,
  asyncRoute(async (req, res) => {
    const { data, error } = await getRecommendationDb()
      .from('job_questions')
      .select(FIELDS)
      .eq('job_id', req.validated.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error && !isMissingTable(error)) throw new ApiError(500, 'QUESTIONS_DATABASE_ERROR', 'Unable to load questions');
    res.json({ success: true, total: data?.length || 0, data: data || [], meta: { enabled: !error } });
  })
);

router.post(
  '/jobs/:id/questions',
  askLimiter,
  validateId,
  asyncRoute(async (req, res) => {
    const body = req.body || {};
    // Honeypot: real visitors never fill the hidden "website" field.
    if (clean(body.website)) return res.status(201).json({ success: true, data: [{ status: 'pending' }] });

    const name = clean(body.name);
    const message = clean(body.message);
    if (name.length < 2 || name.length > 60) throw new ApiError(400, 'INVALID_NAME', 'Name must be 2 to 60 characters');
    if (message.length < 5 || message.length > 1000) {
      throw new ApiError(400, 'INVALID_MESSAGE', 'Question must be 5 to 1000 characters');
    }

    const db = getRecommendationDb();
    const job = await db.from('posts').select('id').eq('id', req.validated.id).eq('status', 'published').maybeSingle();
    if (job.error) throw new ApiError(500, 'QUESTIONS_DATABASE_ERROR', 'Unable to check the job');
    if (!job.data) throw new ApiError(404, 'JOB_NOT_FOUND', 'Job not found');

    const { error } = await db.from('job_questions').insert({ job_id: req.validated.id, name, message });
    if (isMissingTable(error)) throw new ApiError(503, 'QUESTIONS_DISABLED', 'Questions are not enabled yet');
    if (error) throw new ApiError(500, 'QUESTIONS_DATABASE_ERROR', 'Unable to save the question');
    res.status(201).json({ success: true, data: [{ status: 'pending' }] });
  })
);

export default router;
