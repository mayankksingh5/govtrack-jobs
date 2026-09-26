// Vercel function behind /sitemap.xml: every published job and blog article.
import { buildSitemap, SITEMAP_STATIC_PATHS } from '../seo/render.js';

async function fetchAll(url, limit, maxPages) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}page=${page}&limit=${limit}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) break;
    const body = await response.json();
    items.push(...(body.data || []));
    if (!body.pages || page >= body.pages) break;
  }
  return items;
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const siteUrl = (process.env.VITE_SITE_URL || `https://${host}`).replace(/\/$/, '');
  const apiUrl = (process.env.VITE_API_URL || '').replace(/\/$/, '');
  let jobs = [];
  let posts = [];
  if (apiUrl) {
    [jobs, posts] = await Promise.all([
      fetchAll(`${apiUrl}/api/jobs?sort=newest`, 100, 50).catch(() => []),
      fetchAll(`${apiUrl}/api/blog`, 50, 20).catch(() => []),
    ]);
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(buildSitemap({ siteUrl, jobs, posts, staticPaths: SITEMAP_STATIC_PATHS }));
}
