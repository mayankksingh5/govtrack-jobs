import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../api.js';
import { jobPath } from '../lib/slug.js';

export const SITE_NAME = 'GovTrack Jobs';
export const DEFAULT_IMAGE = '/og-image.png';

/* BreadcrumbList for the given trail (Home is added automatically). */
export function breadcrumbSchema(items) {
  const trail = [{ name: 'Home', path: '/' }, ...items];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

/* ItemList of job pages for listing pages (first 20 entries). */
export function itemListSchema(name, jobs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: (jobs || []).slice(0, 20).map((job, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}${jobPath(job)}`,
      name: job.title || job.raw_title,
    })),
  };
}

/*
  Title, description, canonical, Open Graph / Twitter cards and JSON-LD.
  `schema` may be one object or a list; `image` is a path or absolute URL.
*/
export default function SEO({ title, description, path = '/', type = 'website', schema, image, published, modified, noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Government Jobs & Exams`;
  const canonical = `${SITE_URL}${path}`;
  const imageUrl = /^https?:\/\//.test(image || '') ? image : `${SITE_URL}${image || DEFAULT_IMAGE}`;
  const schemas = (Array.isArray(schema) ? schema : [schema]).filter(Boolean);
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content="en_IN" />
      {published && <meta property="article:published_time" content={published} />}
      {modified && <meta property="article:modified_time" content={modified} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {schemas.map((item, index) => (
        <script key={index} type="application/ld+json">{JSON.stringify(item)}</script>
      ))}
    </Helmet>
  );
}
