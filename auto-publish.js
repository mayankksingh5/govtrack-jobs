/*
  Publishing rules for scraper finds (no human review, no AI).

  - Title and URL mention only past years  -> rejected (old lists/results)
  - Title is generic ("Click here", "Detailed Advertisement", ...) -> pending,
    because a visitor could not tell what the post is; an admin names it
  - Anything else -> published with the official title and the official link.
    Dates, vacancies and fees stay empty ("See notification") until an admin
    fills them in /admin.
*/

const LINK_LABEL = {
  job: 'Official notification',
  admit_card: 'Download admit card',
  result: 'Download result',
  answer_key: 'Download answer key',
  other: 'Official notice',
};

const GENERIC_TITLE =
  /^(click|detailed advertisement|detailed advt|advertisement|download|view|read more|apply online|apply now|official website|notification|descriptive notification|list of shortlisted candidates|recruitment exams?|more|details)\b/i;

/*
  Finds whose title and URL mention only past years (e.g. 2024 result lists,
  Jan-2025 verification lists) are old. Query strings are ignored because they
  carry numeric IDs and timestamps. In January the previous year still counts
  as current.
*/
export function isStale(item, now = new Date()) {
  let path = item.url || '';
  try {
    path = decodeURIComponent(new URL(item.url).pathname);
  } catch {}
  const current = now.getFullYear();
  const years = (`${item.raw_title || ''} ${path}`.match(/20\d{2}/g) || [])
    .map(Number)
    .filter((year) => year >= 2010 && year <= current + 1);
  if (!years.length) return false;
  return Math.max(...years) < (now.getMonth() === 0 ? current - 1 : current);
}

export function isGenericTitle(title) {
  const text = String(title || '').trim();
  return text.length < 12 || GENERIC_TITLE.test(text);
}

/* 'rejected' | 'pending' | 'published' for a scraped item. */
export function autoDecision(item, now = new Date()) {
  if (isStale(item, now)) return 'rejected';
  if (isGenericTitle(item.raw_title)) return 'pending';
  return 'published';
}

/*
  "Closing Date for Submission of Online Applications : - 15/07/2026" or
  "Last date: 05-10-2026" in a title -> "2026-07-15" / "2026-10-05".
*/
export function lastDateFromTitle(title) {
  const match = /(?:closing|last)\s+date[^0-9]{0,60}(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i.exec(String(title || ''));
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* Columns to store with a find, according to its decision. */
export function autoFields(item, now = new Date()) {
  const status = autoDecision(item, now);
  if (status !== 'published') return { status };
  return {
    status,
    title: String(item.raw_title).trim().slice(0, 200),
    organization: item.organization || item.source_name || null,
    last_date: lastDateFromTitle(item.raw_title),
    important_links: [{ label: LINK_LABEL[item.type] || LINK_LABEL.other, url: item.url }],
    published_at: now.toISOString(),
  };
}
