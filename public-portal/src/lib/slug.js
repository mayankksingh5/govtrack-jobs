/*
  Readable URLs: /jobs/123-ssc-cgl-2026 instead of /jobs/123. The number in
  front is what the site looks up, so old /jobs/123 links keep working and a
  renamed job never breaks its URL. Shared with the server-side SEO renderer.
*/
export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

export function jobPath(job) {
  const slug = slugify(job.title || job.raw_title || job.post_name);
  return slug ? `/jobs/${job.id}-${slug}` : `/jobs/${job.id}`;
}

/* "123-ssc-cgl-2026" -> 123 (null when there is no leading number). */
export function jobIdFromParam(param) {
  const match = /^(\d+)(?:-|$)/.exec(String(param || ''));
  return match ? Number(match[1]) : null;
}
