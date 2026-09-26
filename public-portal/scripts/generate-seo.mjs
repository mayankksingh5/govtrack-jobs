import { writeFile } from 'node:fs/promises';

const isProduction = process.env.VERCEL_ENV === 'production';
if (isProduction && (!process.env.VITE_API_URL || !process.env.VITE_SITE_URL)) {
  throw new Error('VITE_API_URL and VITE_SITE_URL are required for a production deployment');
}

const apiUrl = new URL(process.env.VITE_API_URL || 'http://localhost:3000');
const siteUrl = (process.env.VITE_SITE_URL || 'https://jobs.example.com').replace(/\/$/, '');
const parsed = new URL(siteUrl);
if (isProduction && (parsed.protocol !== 'https:' || apiUrl.protocol !== 'https:')) {
  throw new Error('VITE_API_URL and VITE_SITE_URL must use HTTPS in production');
}

// sitemap.xml is generated live by api/sitemap.js (every job and article),
// so only robots.txt is written at build time.
const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /login
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: ${siteUrl}/sitemap.xml
`;

await writeFile(new URL('../public/robots.txt', import.meta.url), robots);
