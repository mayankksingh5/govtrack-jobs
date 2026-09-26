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
  /^(click|detailed advertisement|detailed advt|advertisement|download|view|read more|apply online|apply now|official website|notification|descriptive notification|list of shortlisted candidates|recruitment exams?|recruitment results?|more|details|english|hindi)\b/i;

// Uploaded files older than this are treated as old news.
const MAX_UPLOAD_AGE_DAYS = 150;

/*
  Liferay sites such as SBI add the upload time as ?t=<epoch ms>; it is the
  only date on files named like "SCO_15_SELECT_LIST.pdf".
*/
export function uploadedAt(url) {
  try {
    const t = new URL(url).searchParams.get('t');
    if (!/^\d{13}$/.test(t || '')) return null;
    const date = new Date(Number(t));
    return date.getFullYear() >= 2010 ? date : null;
  } catch {
    return null;
  }
}

/*
  Finds whose title and URL mention only past years (e.g. 2024 result lists,
  Jan-2025 verification lists), or whose upload time is old, are old news.
  Other query-string numbers (IDs) are ignored. In January the previous year
  still counts as current.
*/
export function isStale(item, now = new Date()) {
  const uploaded = uploadedAt(item.url);
  if (uploaded && now - uploaded > MAX_UPLOAD_AGE_DAYS * 86_400_000) return true;
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

/* Too vague for a visitor to know which recruitment it is, e.g.
   "MAIN EXAM RESULT" or "English (982 KB)". */
export function isGenericTitle(title) {
  const text = String(title || '').replace(/\s*\(\s*[\d.]+\s*[KM]B\s*\)\s*$/i, '').trim();
  return text.length < 12 || text.split(/\s+/).length < 4 || GENERIC_TITLE.test(text);
}

/*
  IBPS registration pages (ibpsreg.ibps.in/<drive>/) state the application
  window as "Commencement of online registration of application 24/07/2026"
  and "Closure of registration of application 15/08/2026".
*/
export function ibpsDatesFromPage(text) {
  const plain = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const pick = (label) => {
    const match = new RegExp(`${label}[^0-9]{0,40}(\\d{2})/(\\d{2})/(\\d{4})`, 'i').exec(plain);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
  };
  return {
    apply_start: pick('Commencement of online registration'),
    last_date: pick('Closure of registration'),
  };
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
    apply_start: item.apply_start || null,
    last_date: item.last_date || lastDateFromTitle(item.raw_title),
    important_links: [{ label: LINK_LABEL[item.type] || LINK_LABEL.other, url: item.url }],
    published_at: now.toISOString(),
  };
}
