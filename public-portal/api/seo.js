// Vercel function: serves /jobs/:id and /blog/:slug with page-specific SEO tags
// (see seo/render.js). Rewrites live in vercel.json.
import { renderSeoPage } from '../seo/render.js';

let cachedTemplate = null;

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `https://${host}`;
  const siteUrl = (process.env.VITE_SITE_URL || origin).replace(/\/$/, '');
  const apiUrl = (process.env.VITE_API_URL || '').replace(/\/$/, '');

  if (!cachedTemplate) {
    const response = await fetch(`${origin}/index.html`);
    cachedTemplate = await response.text();
  }
  const path = String(req.query?.path || '/');
  const { status, body } = apiUrl
    ? await renderSeoPage({ template: cachedTemplate, path, siteUrl, apiUrl, fetchJson })
    : { status: 200, body: cachedTemplate };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Edge-cache for 10 minutes, serve stale for a day while refreshing.
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  res.status(status).send(body);
}
