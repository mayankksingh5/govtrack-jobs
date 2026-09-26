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

const sectors = ['banking', 'ssc', 'teaching', 'railway', 'defence', 'upsc', 'finance', 'csit', 'medical', 'police', 'engineering', 'state', 'other'];

const paths = [
  '/',
  '/jobs',
  '/search',
  '/exam-calendar',
  '/results',
  '/admit-cards',
  '/answer-keys',
  '/cut-off',
  '/syllabus',
  ...sectors.map((sector) => `/category/${sector}`),
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/disclaimer',
];
const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n')}
</urlset>
`;

await Promise.all([
  writeFile(new URL('../public/robots.txt', import.meta.url), robots),
  writeFile(new URL('../public/sitemap.xml', import.meta.url), sitemap),
]);
