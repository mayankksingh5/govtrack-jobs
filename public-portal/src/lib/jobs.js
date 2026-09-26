import { findLink } from '../utils.js';

const DAY_MS = 86_400_000;
const CLOSING_SOON_DAYS = 7;

/* API dates are plain `YYYY-MM-DD`; parse them as local calendar days. */
export function parseDate(value) {
  if (!value) return null;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = plain ? new Date(+plain[1], +plain[2] - 1, +plain[3]) : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function daysUntil(value) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.round((startOfDay(date) - startOfDay(new Date())) / DAY_MS);
}

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* "01 Jul 2025", as in the design (Intl's en-IN gives "Sept"). */
export function displayDate(value, fallback = '') {
  const date = parseDate(value);
  if (!date) return fallback;
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function timeAgo(value) {
  const date = parseDate(value);
  if (!date) return '';
  const minutes = Math.max(0, Math.round((Date.now() - date.valueOf()) / 60_000));
  if (minutes < 60) return `${minutes || 1} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return displayDate(value);
}

/*
  Recruitment status is derived from the record's type and dates rather than
  stored by hand. Update types map straight to their status; job notices move
  through Upcoming → Active → Closing Soon → Exam/Closed as dates pass.
*/
const TYPE_STATUS = { admit_card: 'Admit Card', result: 'Result', answer_key: 'Answer Key' };

export function statusOf(job = {}) {
  if (TYPE_STATUS[job.type]) return TYPE_STATUS[job.type];
  const toStart = daysUntil(job.apply_start);
  const toEnd = daysUntil(job.last_date);
  const toExam = daysUntil(job.exam_date);
  if (toStart != null && toStart > 0) return 'Upcoming';
  if (toEnd != null) {
    if (toEnd < 0) return toExam != null && toExam >= 0 ? 'Exam' : 'Closed';
    return toEnd <= CLOSING_SOON_DAYS ? 'Closing Soon' : 'Active';
  }
  return 'Active';
}

export const isOpen = (job) => ['Active', 'Closing Soon'].includes(statusOf(job));

export const vacanciesFor = (job) =>
  job.total_vacancy != null ? Number(job.total_vacancy).toLocaleString('en-IN') : 'TBA';

/* Short monogram for the organization tile, e.g. "SSC", "RBI", "IPG". */
export function orgMarkFor(job = {}) {
  const name = (job.organization || job.source_name || '').trim();
  if (!name) return 'GJ';
  if (name.length <= 5 && !name.includes(' ')) return name.toUpperCase();
  const [first] = name.split(/\s+/);
  if (/^[A-Z]{2,5}$/.test(first)) return first; // "UPSC NDA" → "UPSC"
  return name
    .split(/\s+/)
    .filter((word) => !/^(of|and|the|for|&)$/i.test(word))
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export const applyLinkFor = (job) => findLink(job, /apply|registration|register/i);
export const notificationLinkFor = (job) => findLink(job, /notification|advert|pdf|notice/i);
export const officialLinkFor = (job) =>
  findLink(job, /official|website|home/i) ||
  (job.important_links || []).find((link) => /^https?:\/\//i.test(link.url || ''))?.url;
