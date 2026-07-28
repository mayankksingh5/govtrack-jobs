export const titleFor = (job) => job.title || job.raw_title || job.post_name || `Government Job #${job.id}`;
export const organizationFor = (job) => job.organization || job.source_name || 'Government Organization';

export function formatDate(value, fallback = 'Not available') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return fallback;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function findLink(job, expression) {
  return (job.important_links || []).find(
    (link) => expression.test(link.label || '') && /^https?:\/\//i.test(link.url || '')
  )?.url;
}

export function groupByCount(items, getter) {
  const map = new Map();
  for (const item of items) {
    const key = getter(item);
    if (key) map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
