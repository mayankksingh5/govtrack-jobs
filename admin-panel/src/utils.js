export const formatDate = (value, fallback = 'Not available') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return fallback;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

export const jobTitle = (job) => job.title || job.raw_title || job.post_name || `Job #${job.id}`;

export function findLink(job, pattern) {
  return (job.important_links || []).find(
    (link) => pattern.test(link.label || '') && /^https?:\/\//i.test(link.url || '')
  )?.url;
}

export function groupCount(items, value) {
  const groups = new Map();
  items.forEach((item) => {
    const key = value(item) || 'Unknown';
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
}
