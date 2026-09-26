/*
  Server-side SEO for the single-page app. Vercel rewrites /jobs/:id and
  /blog/:slug to api/seo.js, which calls renderSeoPage() to put the page's
  title, description, canonical URL, Open Graph tags, JSON-LD and a plain-HTML
  summary into index.html before it reaches Google, WhatsApp, Telegram, etc.
  The React app then renders over the summary as usual. Pure module so it can
  be tested without Vercel.
*/
import { jobIdFromParam, jobPath } from '../src/lib/slug.js';

const SITE_NAME = 'GovTrack Jobs';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TYPE_LABEL = { job: 'Recruitment', admit_card: 'Admit Card', result: 'Result', answer_key: 'Answer Key', other: 'Notice' };

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// JSON inside <script> must not be able to close the tag.
const jsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

function showDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${match[3]} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : '';
}

const plainText = (markdown) =>
  String(markdown || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_>`|-]/g, '').replace(/\s+/g, ' ').trim();

/* Replace the <title>, drop the default description, append our head tags,
   and put the summary inside #root. Tags carry data-rh so react-helmet-async
   replaces them instead of duplicating them once the app loads. */
export function injectIntoTemplate(template, { title, description, canonical, type, image, schema, noindex, bodyHtml }) {
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" data-rh="true" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" data-rh="true" />`,
    noindex && '<meta name="robots" content="noindex" data-rh="true" />',
    `<meta property="og:site_name" content="${SITE_NAME}" data-rh="true" />`,
    `<meta property="og:type" content="${type}" data-rh="true" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" data-rh="true" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" data-rh="true" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" data-rh="true" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" data-rh="true" />`,
    '<meta property="og:locale" content="en_IN" data-rh="true" />',
    '<meta name="twitter:card" content="summary_large_image" data-rh="true" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" data-rh="true" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" data-rh="true" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" data-rh="true" />`,
    ...(schema || []).map((item) => `<script type="application/ld+json" data-rh="true">${jsonLd(item)}</script>`),
  ].filter(Boolean);
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/?>/i, '')
    // Drop the template's default preview tags; the page-specific ones follow.
    .replace(/\s*<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/<\/head>/i, `    ${tags.join('\n    ')}\n  </head>`)
    .replace(/<div id="root"><\/div>/i, `<div id="root">${bodyHtml || ''}</div>`);
}

function jobPage(job, siteUrl) {
  const title = job.title || job.raw_title;
  const organization = job.organization || job.source_name || 'Government of India';
  const path = jobPath(job);
  const canonical = `${siteUrl}${path}`;
  const facts = [
    ['Organization', organization],
    ['Post', job.post_name],
    ['Vacancies', job.total_vacancy != null && Number(job.total_vacancy).toLocaleString('en-IN')],
    ['Qualification', job.qualification],
    ['Age limit', job.age_limit],
    ['Application fee', job.fee_info],
    ['Apply from', showDate(job.apply_start)],
    ['Last date', showDate(job.last_date)],
    ['Exam date', showDate(job.exam_date)],
  ].filter(([, value]) => value);
  const summary = job.short_info ||
    `${title} by ${organization}${job.total_vacancy != null ? ` — ${Number(job.total_vacancy).toLocaleString('en-IN')} posts` : ''}${job.last_date ? `, last date ${showDate(job.last_date)}` : ''}. Eligibility, fees, dates and official links.`;
  const description = summary.slice(0, 160);
  const links = (job.important_links || []).filter((link) => /^https?:\/\//i.test(link.url || ''));
  const official = links[0]?.url;
  const factList = facts.map(([label, value]) => `<li>${label}: ${escapeHtml(value)}</li>`).join('');

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Jobs', item: `${siteUrl}/jobs` },
        { '@type': 'ListItem', position: 3, name: title, item: canonical },
      ],
    },
    job.type === 'job'
      ? {
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title,
          description: `<p>${escapeHtml(summary)}</p><ul>${factList}</ul><p>Check the official notification before applying.</p>`,
          identifier: { '@type': 'PropertyValue', name: organization, value: String(job.id) },
          datePosted: String(job.published_at || '').slice(0, 10) || undefined,
          validThrough: job.last_date ? `${job.last_date}T23:59:59+05:30` : undefined,
          hiringOrganization: { '@type': 'Organization', name: organization, ...(official && { sameAs: new URL(official).origin }) },
          employmentType: 'FULL_TIME',
          jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'IN' } },
          applicantLocationRequirements: { '@type': 'Country', name: 'India' },
          directApply: false,
          ...(job.total_vacancy != null && { totalJobOpenings: job.total_vacancy }),
          ...(job.qualification && { educationRequirements: job.qualification }),
          url: canonical,
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: title,
          description,
          datePublished: job.published_at,
          dateModified: job.updated_at || job.published_at,
          mainEntityOfPage: canonical,
          author: { '@type': 'Organization', name: SITE_NAME, url: siteUrl },
          publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${siteUrl}/favicon.svg` } },
        },
  ];

  const bodyHtml = `<main class="container seo-fallback"><nav><a href="/">Home</a> / <a href="/jobs">Jobs</a></nav>
<article><p>${escapeHtml(TYPE_LABEL[job.type] || 'Recruitment')} · ${escapeHtml(organization)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(summary)}</p>
<ul>${factList}</ul>
${links.length ? `<h2>Official links</h2><ul>${links.map((link) => `<li><a href="${escapeHtml(link.url)}" rel="noopener nofollow">${escapeHtml(link.label || 'Official link')}</a></li>`).join('')}</ul>` : ''}
<p>Always verify details in the official notification before applying.</p></article></main>`;

  return { title: `${title} | ${SITE_NAME}`, description, canonical, type: 'article', schema, bodyHtml };
}

function blogPage(post, siteUrl) {
  const canonical = `${siteUrl}/blog/${post.slug}`;
  const text = plainText(post.body);
  const description = (post.excerpt || text).slice(0, 160);
  const paragraphs = text.slice(0, 1500);
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description,
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      mainEntityOfPage: canonical,
      ...(post.cover_image_url && { image: [post.cover_image_url] }),
      ...(post.tags?.length && { keywords: post.tags.join(', ') }),
      author: { '@type': 'Organization', name: SITE_NAME, url: siteUrl },
      publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${siteUrl}/favicon.svg` } },
    },
  ];
  const bodyHtml = `<main class="container seo-fallback"><nav><a href="/">Home</a> / <a href="/blog">Blog</a></nav>
<article><h1>${escapeHtml(post.title)}</h1><p>${escapeHtml(showDate(post.published_at))}</p><p>${escapeHtml(paragraphs)}</p></article></main>`;
  return {
    title: `${post.title} | ${SITE_NAME}`,
    description,
    canonical,
    type: 'article',
    image: post.cover_image_url || undefined,
    schema,
    bodyHtml,
  };
}

/*
  Returns { status, body }. On any data problem it falls back to the plain
  app shell so the page still works; unknown jobs/articles get 404 + noindex.
*/
export async function renderSeoPage({ template, path, siteUrl, apiUrl, fetchJson }) {
  const cleanPath = String(path || '/').split('?')[0];
  const defaultImage = `${siteUrl}/og-image.png`;
  try {
    const jobMatch = /^\/jobs\/([^/]+)\/?$/.exec(cleanPath);
    if (jobMatch) {
      const id = jobIdFromParam(jobMatch[1]);
      const job = id ? (await fetchJson(`${apiUrl}/api/jobs/${id}`))?.data?.[0] : null;
      if (!job) return notFound(template, siteUrl, cleanPath, defaultImage);
      const page = jobPage(job, siteUrl);
      return { status: 200, body: injectIntoTemplate(template, { ...page, image: defaultImage }) };
    }
    const blogMatch = /^\/blog\/([a-z0-9-]{1,120})\/?$/.exec(cleanPath);
    if (blogMatch) {
      const post = (await fetchJson(`${apiUrl}/api/blog/${blogMatch[1]}`))?.data?.[0];
      if (!post) return notFound(template, siteUrl, cleanPath, defaultImage);
      const page = blogPage(post, siteUrl);
      return { status: 200, body: injectIntoTemplate(template, { ...page, image: page.image || defaultImage }) };
    }
  } catch {
    return { status: 200, body: template };
  }
  return { status: 200, body: template };
}

function notFound(template, siteUrl, path, image) {
  return {
    status: 404,
    body: injectIntoTemplate(template, {
      title: `Page not found | ${SITE_NAME}`,
      description: 'This page could not be found. It may have been removed or the address may be wrong.',
      canonical: `${siteUrl}${path}`,
      type: 'website',
      image,
      noindex: true,
    }),
  };
}

/* sitemap.xml for every published job and blog article plus the fixed pages. */
export function buildSitemap({ siteUrl, jobs = [], posts = [], staticPaths = [] }) {
  const url = (loc, lastmod) =>
    `  <url><loc>${escapeHtml(`${siteUrl}${loc}`)}</loc>${lastmod ? `<lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : ''}</url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticPaths.map((path) => url(path)),
    ...jobs.map((job) => url(jobPath(job), job.updated_at || job.published_at)),
    ...posts.map((post) => url(`/blog/${post.slug}`, post.updated_at || post.published_at)),
    '</urlset>',
    '',
  ].join('\n');
}

export const SITEMAP_STATIC_PATHS = [
  '/', '/jobs', '/search', '/exam-calendar', '/results', '/admit-cards', '/answer-keys', '/cut-off', '/syllabus',
  '/community', '/blog',
  ...['banking', 'ssc', 'teaching', 'railway', 'defence', 'upsc', 'finance', 'csit', 'medical', 'police', 'engineering', 'state', 'other']
    .map((sector) => `/category/${sector}`),
  '/about', '/contact', '/privacy', '/terms', '/disclaimer',
];
