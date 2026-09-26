import { Router } from 'express';
import { getRecommendationDb } from './db.js';
import { ApiError, asyncRoute } from './middleware.js';
import { isMissingTable } from './question-routes.js';

/*
  Blog articles. Visitors see published ones; the admin writes and edits
  them through /api/admin/blog (see admin-routes.js).
*/
const router = Router();
export const BLOG_LIST_FIELDS = 'id, slug, title, excerpt, cover_image_url, tags, related_job_id, status, published_at, updated_at';
const BLOG_FIELDS = `${BLOG_LIST_FIELDS}, body`;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

router.get(
  '/blog',
  asyncRoute(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '12', 10) || 12));
    const from = (page - 1) * limit;
    const { data, count, error } = await getRecommendationDb()
      .from('blog_posts')
      .select(BLOG_LIST_FIELDS, { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(from, from + limit - 1);
    if (isMissingTable(error)) {
      return res.json({ success: true, total: 0, page, pages: 0, data: [], meta: { enabled: false } });
    }
    if (error) throw new ApiError(500, 'BLOG_DATABASE_ERROR', 'Unable to load articles');
    res.json({ success: true, total: count || 0, page, pages: count ? Math.ceil(count / limit) : 0, data, meta: { enabled: true } });
  })
);

router.get(
  '/blog/:slug',
  asyncRoute(async (req, res) => {
    const slug = String(req.params.slug || '');
    if (!SLUG.test(slug) || slug.length > 120) throw new ApiError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
    const db = getRecommendationDb();
    const { data, error } = await db.from('blog_posts').select(BLOG_FIELDS).eq('slug', slug).eq('status', 'published').maybeSingle();
    if (error && !isMissingTable(error)) throw new ApiError(500, 'BLOG_DATABASE_ERROR', 'Unable to load the article');
    if (!data) throw new ApiError(404, 'ARTICLE_NOT_FOUND', 'Article not found');

    // Attach the linked job (if it is still published) for the "Related job" card.
    let related_job = null;
    if (data.related_job_id) {
      const job = await db
        .from('posts')
        .select('id, title, raw_title, organization, source_name, type, apply_start, last_date, exam_date, total_vacancy, qualification, important_links, published_at, updated_at')
        .eq('id', data.related_job_id)
        .eq('status', 'published')
        .maybeSingle();
      related_job = job.data || null;
    }
    res.json({ success: true, data: [{ ...data, related_job }] });
  })
);

export default router;
