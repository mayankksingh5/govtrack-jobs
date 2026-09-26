import { organizationFor } from '../utils.js';
import { daysUntil, parseDate, statusOf } from './jobs.js';
import { sectorOf } from './sectors.js';

export const QUALIFICATIONS = {
  '10th Pass': /10th|matric|high school/i,
  '12th Pass': /12th|intermediate|higher secondary|\bhsc\b/i,
  Diploma: /diploma|\biti\b/i,
  Graduate: /graduat|degree|bachelor/i,
  Postgraduate: /post ?graduat|master|\bmba\b|\bm\.?sc\b|\bm\.?a\b|\bpg\b/i,
  'B.Tech / B.E': /b\.?\s?tech|\bb\.?e\b|engineering/i,
};

export function matchesKeyword(job, query) {
  if (!query) return true;
  const text = [job.title, job.raw_title, job.organization, job.source_name, job.post_name, job.qualification]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
}

/* Applies the shared filter-bar values: keyword, sector, organization, qualification. */
export function applyFilterBar(jobs, { q, sector, org, qualification } = {}) {
  return jobs.filter(
    (job) =>
      matchesKeyword(job, q) &&
      (!sector || sectorOf(job) === sector) &&
      (!org || organizationFor(job) === org) &&
      (!qualification || QUALIFICATIONS[qualification]?.test(job.qualification || ''))
  );
}

export const organizationsIn = (jobs) => [...new Set(jobs.map(organizationFor))].sort((a, b) => a.localeCompare(b));

export const newestFirst = (a, b) =>
  (parseDate(b.published_at)?.valueOf() || 0) - (parseDate(a.published_at)?.valueOf() || 0);

export function paginate(items, page, size) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}

/* "Refine results" groups on the search page. Each option is a predicate. */
const within = (value, from, to) => {
  const days = daysUntil(value);
  return days != null && days >= from && days <= to;
};
const vacancies = (job) => (job.total_vacancy == null ? null : Number(job.total_vacancy));

export const REFINE_GROUPS = [
  {
    key: 'status',
    label: 'Application status',
    options: {
      Active: (job) => statusOf(job) === 'Active',
      Upcoming: (job) => statusOf(job) === 'Upcoming',
      'Closing Soon': (job) => statusOf(job) === 'Closing Soon',
      Closed: (job) => statusOf(job) === 'Closed',
    },
  },
  {
    key: 'qualification',
    label: 'Qualification',
    options: Object.fromEntries(
      Object.entries(QUALIFICATIONS).map(([label, pattern]) => [label, (job) => pattern.test(job.qualification || '')])
    ),
  },
  {
    key: 'exam',
    label: 'Exam date',
    options: {
      'This month': (job) => within(job.exam_date, 0, 31),
      'Next 3 months': (job) => within(job.exam_date, 0, 92),
    },
  },
  {
    key: 'last',
    label: 'Last date',
    options: {
      'This week': (job) => within(job.last_date, 0, 7),
      'This month': (job) => within(job.last_date, 0, 31),
    },
  },
  {
    key: 'vacancy',
    label: 'Vacancy range',
    options: {
      'Up to 100': (job) => vacancies(job) != null && vacancies(job) <= 100,
      '100 – 1,000': (job) => vacancies(job) > 100 && vacancies(job) <= 1000,
      '1,000+': (job) => vacancies(job) > 1000,
    },
  },
];

/* A job passes when, in every group with selections, it matches one of them. */
export function applyRefine(jobs, selected) {
  return jobs.filter((job) =>
    REFINE_GROUPS.every((group) => {
      const chosen = selected[group.key] || [];
      return !chosen.length || chosen.some((option) => group.options[option]?.(job));
    })
  );
}

export const SORTS = {
  Latest: newestFirst,
  'Closing Soon': (a, b) => (daysUntil(a.last_date) ?? Infinity) - (daysUntil(b.last_date) ?? Infinity),
  Upcoming: (a, b) => (daysUntil(a.apply_start) ?? Infinity) - (daysUntil(b.apply_start) ?? Infinity),
  'Exam Date': (a, b) => (daysUntil(a.exam_date) ?? Infinity) - (daysUntil(b.exam_date) ?? Infinity),
  Vacancies: (a, b) => (vacancies(b) ?? -1) - (vacancies(a) ?? -1),
};
