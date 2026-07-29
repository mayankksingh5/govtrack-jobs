#!/usr/bin/env node
/**
 * Sarkari notification scraper
 *
 *   node scraper.js                    -> saare enabled sources, DB me likho
 *   node scraper.js --only ssc,uppsc   -> sirf ye sources
 *   node scraper.js --discover ssc     -> kuch likho mat, bas dikhao kya mila
 *                                         (naya source tune karne ke liye)
 *   node scraper.js --dry              -> sab chalao par DB write mat karo
 *
 * Design note: hum CSS selector pe depend nahi karte by default.
 * Gov sites apna HTML mahine me do baar badal deti hain aur selector
 * chup-chaap toot jaata hai. Isliye default strategy = page ke SAARE
 * links uthao, phir keyword + year se filter karo. Ye thoda zyada
 * noise deta hai, par kabhi silently zero result nahi deta -- aur noise
 * aap admin panel me 5 second me reject kar sakte ho.
 */

import { load } from 'cheerio';
import { Agent, fetch as undiciFetch } from 'undici';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isPdfUrl, parsePdfNotification } from './pdf-parser.js';

// ---------------------------------------------------------------- config

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';

const TIMEOUT_MS = 25_000;
const RETRIES = 2;
const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1];

// Sarkari sites ka SSL aksar toota hua hota hai. Ye agent sirf un
// sources ke liye use hota hai jinme insecureTLS: true set hai.
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

// ------------------------------------------------------- classification

// Order matters -- upar wala jeetta hai.
// "Result of Admit Card" jaise titles me admit card pehle match ho.
const TYPE_RULES = [
  {
    type: 'answer_key',
    re: /\b(answer\s*key|final\s*key|response\s*sheet|objection\s*tracker)\b/i,
  },
  {
    type: 'admit_card',
    re: /\b(admit\s*card|call\s*letter|hall\s*ticket|e-?admit|exam\s*city|intimation\s*(slip|letter)|admission\s*certificate)\b/i,
  },
  {
    type: 'result',
    re: /\b(result|merit\s*list|cut[\s-]*off|score\s*card|marks?\s*sheet|selection\s*list|shortlist(ed)?|final\s*selection|declaration\s*of)\b/i,
  },
  {
    type: 'job',
    re: /\b(recruit(ment)?|vacanc(y|ies)|advertisement|advt\.?|apply\s*online|online\s*application|notification|invites?\s*application|walk[\s-]*in|cen\s*\d|post\s*of|engagement\s*of)\b/i,
  },
];

// Ye mila to link straight-away drop -- sarkari sites tenders aur
// RTI notices se bhari hoti hain.
const GLOBAL_NOISE =
  /\b(tender|e-?procurement|rti|right\s*to\s*information|privacy\s*policy|terms\s*(and|&)\s*conditions|disclaimer|sitemap|screen\s*reader|accessibility|feedback|contact\s*us|help\s*desk|login|sign\s*in|register|home\s*page|archive[sd]?|corrigendum|photo\s*gallery|annual\s*report|circular\s*regarding\s*(leave|transfer|posting))\b/i;

function classify(text, url, source) {
  if (source.forceType) return source.forceType;
  const hay = `${text} ${url}`;
  for (const rule of TYPE_RULES) if (rule.re.test(hay)) return rule.type;
  return null; // null = ye link relevant hi nahi hai
}

// ---------------------------------------------------------------- fetch

async function fetchHtml(url, { insecureTLS = false } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt) await sleep(1500 * attempt);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await undiciFetch(url, {
        signal: ctrl.signal,
        redirect: 'follow',
        dispatcher: insecureTLS ? insecureAgent : undefined,
        headers: {
          'user-agent': UA,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-IN,en;q=0.9,hi;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      return {
        html,
        status: res.status,
        responseSize: Buffer.byteLength(html),
      };
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

// -------------------------------------------------------------- harvest

function harvestLinks(html, baseUrl, source) {
  const $ = load(html);
  const scope = source.selector ? $(source.selector) : $('body');

  const includeRe = source.include ? new RegExp(source.include) : null;
  const excludeRe = source.exclude ? new RegExp(source.exclude) : null;
  const urlIncludeRe = source.urlInclude ? new RegExp(source.urlInclude) : null;

  const seen = new Set();
  const out = [];

  scope.find('a').addBack('a').each((_, el) => {
    const $el = $(el);

    // Link text + title attribute dono lo -- kai sites text image me
    // rakhti hain aur asli title alt/title attribute me hota hai.
    const text = [
      $el.text(),
      $el.attr('title') || '',
      $el.find('img').attr('alt') || '',
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const href = $el.attr('href');
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) return;
    if (text.length < 12 || text.length > 300) return;

    let abs;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      return;
    }
    if (!/^https?:/i.test(abs)) return;

    if (GLOBAL_NOISE.test(text)) return;
    if (includeRe && !includeRe.test(text)) return;
    if (excludeRe && excludeRe.test(text)) return;
    if (urlIncludeRe && !urlIncludeRe.test(abs)) return;

    const type = classify(text, abs, source);
    if (!type) return;

    if (source.requireYear) {
      const hay = `${text} ${abs}`;
      if (!YEARS.some((y) => hay.includes(String(y)))) return;
    }

    const fingerprint = fp(source.id, abs);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);

    out.push({
      fingerprint,
      source_id: source.id,
      source_name: source.name,
      raw_title: cleanTitle(text),
      url: abs,
      type,
      important_links: [],
    });
  });

  return out;
}

function cleanTitle(t) {
  return t
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s*(new|latest|click here|download|view|पीडीएफ)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

// Canonical URL: query string aur hash hata do, warna PHPSESSID jaise
// params har run me naya fingerprint bana denge = duplicate spam.
// Agar kisi source ka asli id query me hai (?id=123) to us source ke
// liye ye behaviour badalna padega.
function fp(sourceId, url) {
  let canon = url;
  try {
    const u = new URL(url);
    u.hash = '';
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      if (/^(id|nid|notice|advt|doc|file|page)/i.test(k)) keep.set(k, v);
    }
    u.search = keep.toString();
    canon = u.toString();
  } catch {}
  return createHash('sha1').update(`${sourceId}::${canon.toLowerCase()}`).digest('hex');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ run

async function main() {
  const args = process.argv.slice(2);
  const discover = argVal(args, '--discover');
  const only = (argVal(args, '--only') || discover || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const dry = args.includes('--dry') || !!discover;

  const all = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
  const sources = all.filter(
    (s) => s.id && !s._comment && (only.length ? only.includes(s.id) : s.enabled)
  );

  if (!sources.length) {
    console.error('Koi source match nahi hua. sources.json check karo.');
    process.exit(1);
  }

  const db = dry ? null : makeDb();
  const runLog = [];
  let totalNew = 0;
  let totalFound = 0;
  let totalDuplicates = 0;
  let totalFailed = 0;
  let pdfsFound = 0;
  let pdfsParsed = 0;
  let pdfsFailed = 0;
  let pdfConfidenceTotal = 0;
  const freshItems = [];

  for (const source of sources) {
    const t0 = Date.now();
    try {
      const response = await fetchHtml(source.url, { insecureTLS: source.insecureTLS });
      const { html } = response;
      const items = harvestLinks(html, source.url, source);
      totalFound += items.length;

      if (response.status === 200 && items.length === 0) {
        totalFailed++;
        const timestamp = new Date().toISOString();
        const diagnosis = diagnoseZeroResult(html, source);
        console.warn(`WARNING:
HTTP 200 received but no jobs were extracted.
The website structure may have changed.`);
        console.warn(
          `source=${source.id} url=${source.url} status=${response.status} ` +
            `response_size=${response.responseSize} extracted_links=0 timestamp=${timestamp}`
        );
        console.warn(`
Diagnosis:
Possible Cause:
${diagnosis.detectedReason}

Matched Pattern:
${diagnosis.matchedPattern}

Recommendation:
${diagnosis.recommendation}`);
        await saveZeroResultWarning({
          source_id: source.id,
          url: source.url,
          http_status: response.status,
          response_size: response.responseSize,
          extracted_links: 0,
          timestamp,
        });
        await saveFailureDiagnosis({
          source_id: source.id,
          url: source.url,
          http_status: response.status,
          extracted_links: 0,
          detected_reason: diagnosis.detectedReason,
          matched_pattern: diagnosis.matchedPattern,
          timestamp,
        });

        if (!discover) {
          runLog.push({
            source_id: source.id,
            ok: false,
            links_found: 0,
            new_items: 0,
            error: 'HTTP 200 received but no jobs were extracted',
            ms: Date.now() - t0,
          });
        }
        continue;
      }

      if (discover) {
        console.log(`\n=== ${source.name} (${source.id}) — ${items.length} links ===`);
        for (const it of items) console.log(`  [${it.type.padEnd(10)}] ${it.raw_title}\n      ${it.url}`);
        continue;
      }

      let inserted = [];
      let duplicates = [];
      if (db && items.length) {
        const result = await insertNew(db, items);
        inserted = result.inserted;
        duplicates = result.duplicates;
        const pdfResult = await processPdfCandidates(result.pdfCandidates, source);
        pdfsFound += pdfResult.found;
        pdfsParsed += pdfResult.parsed;
        pdfsFailed += pdfResult.failed;
        pdfConfidenceTotal += pdfResult.confidenceTotal;
      }
      totalNew += inserted.length;
      totalDuplicates += duplicates.length;
      freshItems.push(...inserted);

      console.log(
        `ok   ${source.id.padEnd(20)} found=${String(items.length).padStart(3)} ` +
          `new=${inserted.length} duplicates=${duplicates.length}`
      );
      runLog.push({
        source_id: source.id,
        ok: true,
        links_found: items.length,
        new_items: inserted.length,
        ms: Date.now() - t0,
      });
    } catch (e) {
      totalFailed++;
      console.error(`FAIL ${source.id.padEnd(20)} ${e.message}`);
      runLog.push({
        source_id: source.id,
        ok: false,
        error: String(e.message).slice(0, 500),
        ms: Date.now() - t0,
      });
    }
    await sleep(1200); // gov servers ko hammer mat karo
  }

  printRunSummary({
    found: totalFound,
    added: totalNew,
    duplicates: totalDuplicates,
    failed: totalFailed,
  });
  printPdfSummary({
    found: pdfsFound,
    parsed: pdfsParsed,
    failed: pdfsFailed,
    confidenceTotal: pdfConfidenceTotal,
  });

  if (discover) return;

  if (db && runLog.length) await db.from('scrape_runs').insert(runLog);

  console.log(`\n--- ${totalNew} naye item pending me gaye ---`);
  if (freshItems.length) await notifyTelegram(freshItems);

  // Agar SAB source fail ho gaye to exit code 1 -> GitHub Actions
  // aapko email bhej dega. Warna silent failure me hafton pata nahi chalta.
  if (runLog.length && runLog.every((r) => !r.ok)) process.exit(1);
}

function diagnoseZeroResult(html, source) {
  const $ = load(html);
  const pageText = $('body').text().replace(/\s+/g, ' ').trim();
  const title = $('title').text().replace(/\s+/g, ' ').trim();
  const evidence = `${title} ${pageText} ${html}`;

  const checks = [
    {
      reason: 'Cloudflare Protection',
      pattern: /\b(cloudflare|cf-chl-|checking your browser|just a moment)\b/i,
      recommendation:
        'Inspect this source in a browser and identify an official static page or API; browser rendering may be required.',
    },
    {
      reason: 'CAPTCHA',
      pattern: /\b(captcha|g-recaptcha|hcaptcha|verify you are human)\b/i,
      recommendation:
        'Manual access is required; do not attempt to bypass the CAPTCHA.',
    },
    {
      reason: 'Access Denied',
      pattern: /\b(access denied|request blocked|forbidden|you do not have permission|unauthorized access)\b/i,
      recommendation:
        'Verify the official URL and whether the site permits automated access.',
    },
    {
      reason: 'Maintenance Page',
      pattern: /\b(under maintenance|maintenance mode|temporarily unavailable|service unavailable|down for maintenance)\b/i,
      recommendation: 'Retry later and keep the source under monitoring.',
    },
    {
      reason: 'Login Page',
      pattern: /<input[^>]+type=["']password["']|<form[^>]+(?:login|sign-?in)|\bplease log in to continue\b/i,
      recommendation: 'Use a public notifications page that does not require authentication.',
    },
    {
      reason: 'Redirect Page',
      pattern: /http-equiv=["']?refresh|(?:window\.)?location\.(?:href|replace|assign)\s*[=(]/i,
      recommendation: 'Update the source URL to the redirect destination and verify it.',
    },
    {
      reason: 'JavaScript Application',
      pattern:
        /<app-root\b|<div[^>]+id=["'](?:root|app)["'][^>]*>\s*<\/div>|__NEXT_DATA__|cf-ng-loader|webpackJsonp|enable javascript to run this app/i,
      recommendation:
        'Inspect the application in browser DevTools for a public JSON API or use browser rendering.',
    },
  ];

  for (const check of checks) {
    const match = evidence.match(check.pattern);
    if (match) {
      return {
        detectedReason: check.reason,
        matchedPattern: match[0].replace(/\s+/g, ' ').slice(0, 160),
        recommendation: check.recommendation,
      };
    }
  }

  if (source.selector && $(source.selector).length === 0) {
    return {
      detectedReason: 'Selector Missing',
      matchedPattern: `Configured selector not found: ${source.selector}`,
      recommendation: 'Update source selectors.',
    };
  }

  if (pageText.length < 100 || $('body').children().length === 0) {
    return {
      detectedReason: 'Empty Content Area',
      matchedPattern: `Visible body text length: ${pageText.length}`,
      recommendation: 'Verify the URL and inspect why the server returned an empty page.',
    };
  }

  return {
    detectedReason: 'No Harvestable Links',
    matchedPattern: 'No known protection, login, redirect, maintenance, SPA, or empty-page pattern matched',
    recommendation: 'Inspect the page structure and source filters; expected notification links may have changed.',
  };
}

async function saveZeroResultWarning(warning) {
  await appendJsonLog(new URL('./logs/zero-results.json', import.meta.url), warning);
}

async function saveFailureDiagnosis(diagnosis) {
  await appendJsonLog(new URL('./logs/failure-diagnosis.json', import.meta.url), diagnosis);
}

async function appendJsonLog(logUrl, entry) {
  await mkdir(dirname(fileURLToPath(logUrl)), { recursive: true });

  let entries = [];
  try {
    entries = JSON.parse(await readFile(logUrl, 'utf8'));
    if (!Array.isArray(entries)) throw new Error(`${logUrl.pathname} must contain a JSON array`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  entries.push(entry);
  await writeFile(logUrl, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

function argVal(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

function jsonFilter(value) {
  return JSON.stringify(value);
}

function makeDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY env missing.');
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function insertNew(db, items) {
  const inserted = [];
  const duplicates = [];
  const pdfCandidates = [];

  for (const item of items) {
    const duplicate = await findDuplicate(db, item);
    if (duplicate) {
      await markDuplicateSeen(db, duplicate, item);
      duplicates.push(duplicate);
      if (isPdfUrl(item.url)) pdfCandidates.push({ jobId: duplicate.id, item });
      continue;
    }

    const { data, error } = await db
      .from('posts')
      .upsert(item, { onConflict: 'fingerprint', ignoreDuplicates: true })
      .select('id, raw_title, url, type, source_name');
    if (error) throw new Error(`DB: ${error.message}`);

    if (data?.length) {
      inserted.push(...data);
      if (isPdfUrl(item.url)) pdfCandidates.push({ jobId: data[0].id, item });
      continue;
    }

    // Another run may have inserted the same fingerprint between the
    // duplicate check and this upsert.
    const { data: existing, error: existingError } = await db
      .from('posts')
      .select('id, raw_title, title, url, source_id, source_name, organization, important_links')
      .eq('fingerprint', item.fingerprint)
      .limit(1);
    if (existingError) throw new Error(`DB: ${existingError.message}`);
    if (existing?.[0]) {
      const racedDuplicate = { ...existing[0], matched_by: 'fingerprint' };
      await markDuplicateSeen(db, racedDuplicate, item);
      duplicates.push(racedDuplicate);
      if (isPdfUrl(item.url)) pdfCandidates.push({ jobId: racedDuplicate.id, item });
    }
  }

  return { inserted, duplicates, pdfCandidates };
}

async function processPdfCandidates(candidates, source) {
  const result = { found: candidates.length, parsed: 0, failed: 0, confidenceTotal: 0 };
  for (const candidate of candidates) {
    try {
      const parsed = await parsePdfNotification({
        jobId: candidate.jobId,
        url: candidate.item.url,
        sourceName: candidate.item.source_name,
        title: candidate.item.raw_title,
        insecureTLS: source.insecureTLS,
      });
      await appendJsonLog(new URL('./logs/pdf-parser.json', import.meta.url), parsed.log);
      if (parsed.success) {
        result.parsed++;
        result.confidenceTotal += parsed.confidence;
      } else {
        result.failed++;
      }
    } catch (error) {
      console.error(
        `PDF Parser Error: job=${candidate.jobId} url=${candidate.item.url} error=${error.message}`
      );
      result.failed++;
      await appendJsonLog(new URL('./logs/pdf-parser.json', import.meta.url), {
        job_id: candidate.jobId,
        pdf_url: candidate.item.url,
        pdf_download: 'Unknown',
        parse: 'Failure',
        extraction_confidence: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return result;
}

async function findDuplicate(db, item) {
  const fields =
    'id, raw_title, title, url, source_id, source_name, organization, important_links';

  const { data: sameUrl, error: urlError } = await db
    .from('posts')
    .select(fields)
    .eq('url', item.url)
    .limit(1);
  if (urlError) throw new Error(`DB: ${urlError.message}`);
  if (sameUrl?.[0]) return { ...sameUrl[0], matched_by: 'official_or_apply_url' };

  const { data: linkedUrl, error: linkedUrlError } = await db
    .from('posts')
    .select(fields)
    .filter('important_links', 'cs', jsonFilter([{ url: item.url }]))
    .limit(1);
  if (linkedUrlError) throw new Error(`DB: ${linkedUrlError.message}`);
  if (linkedUrl?.[0]) return { ...linkedUrl[0], matched_by: 'important_link_url' };

  const candidates = new Map();
  for (const column of ['source_name', 'organization']) {
    const { data, error } = await db
      .from('posts')
      .select(fields)
      .eq(column, item.source_name)
      .limit(1000);
    if (error) throw new Error(`DB: ${error.message}`);
    for (const candidate of data || []) candidates.set(candidate.id, candidate);
  }

  const itemOrganization = normalizeText(item.source_name);
  for (const candidate of candidates.values()) {
    const candidateOrganization = normalizeText(candidate.organization || candidate.source_name);
    if (candidateOrganization !== itemOrganization) continue;

    const candidateTitle = candidate.title || candidate.raw_title;
    if (titleSimilarity(item.raw_title, candidateTitle) >= 0.95) {
      return { ...candidate, matched_by: 'title_and_organization' };
    }
  }

  return null;
}

async function markDuplicateSeen(db, duplicate, item) {
  const timestamp = new Date().toISOString();
  const { error } = await db
    .from('posts')
    .update({ updated_at: timestamp })
    .eq('id', duplicate.id);
  if (error) throw new Error(`DB: ${error.message}`);

  console.log(`Duplicate detected
Existing Job ID: ${duplicate.id}
Source ID: ${item.source_id}`);

  await appendJsonLog(new URL('./logs/duplicates.json', import.meta.url), {
    duplicate_detected: true,
    existing_job_id: duplicate.id,
    source_id: item.source_id,
    matched_by: duplicate.matched_by,
    last_seen: timestamp,
  });
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function titleSimilarity(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }

  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

function printRunSummary({ found, added, duplicates, failed }) {
  console.log(`
Jobs Found: ${found}
Jobs Added: ${added}
Duplicates Skipped: ${duplicates}
Failed: ${failed}`);
}

function printPdfSummary({ found, parsed, failed, confidenceTotal }) {
  const average = parsed ? Math.round(confidenceTotal / parsed) : 0;
  console.log(`
PDFs Found: ${found}
Parsed Successfully: ${parsed}
Failed: ${failed}
Average Extraction Confidence: ${average}%`);
}

async function notifyTelegram(items) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;

  const lines = items
    .slice(0, 20)
    .map((i) => `• <b>[${i.type}]</b> ${esc(i.source_name)}\n${esc(i.raw_title.slice(0, 120))}`);
  const more = items.length > 20 ? `\n…aur ${items.length - 20} item` : '';
  const text = `<b>${items.length} naye notification pending me</b>\n\n${lines.join('\n\n')}${more}`;

  try {
    await undiciFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: text.slice(0, 4000),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error('Telegram notify fail:', e.message);
  }
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Sirf tab chalao jab file directly run ho -- import karke test likh sako.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { harvestLinks, classify, fp, normalizeText, titleSimilarity };
