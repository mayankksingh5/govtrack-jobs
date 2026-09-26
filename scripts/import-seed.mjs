/*
  Imports hand-checked jobs from seed/ into Supabase and tidies the review
  queue. Runs from .github/workflows/import-seed.yml whenever seed/ changes on
  main, so publishing curated jobs never needs SQL copy-paste.

  1. seed/jobs.json      -> published (inserted, or completing a pending find)
  2. seed/reject-urls.json -> pending finds with these URLs become rejected
  3. every other pending find -> auto-publish.js rules (old -> rejected,
     clear title -> published, generic title -> stays pending)

  Already-published rows are never overwritten, so edits made in /admin stay.
  Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/import-seed.mjs [--dry]
*/
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { autoFields } from '../auto-publish.js';

const TYPES = new Set(['job', 'admit_card', 'result', 'answer_key', 'other']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROW_FIELDS = 'id, url, status, raw_title, type, source_name, organization, slug, published_at';

const text = (value, max) => (value == null || String(value).trim() === '' ? null : String(value).trim().slice(0, max));
const date = (value) => (typeof value === 'string' && DATE.test(value) ? value : null);
const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null);
export const slugify = (value) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/* Seed entry -> post columns. Returns null (with a reason) when unusable. */
export function seedFields(entry) {
  const links = (entry.links || [])
    .filter((link) => /^https?:\/\/\S+$/i.test(link?.url || ''))
    .map((link) => ({ label: text(link.label, 80) || 'Official link', url: link.url }));
  if (!/^https?:\/\/\S+$/i.test(entry.url || '')) return { error: 'missing url' };
  if (!text(entry.title, 200)) return { error: 'missing title' };
  if (!links.length) return { error: 'no official link' };
  return {
    fields: {
      type: TYPES.has(entry.type) ? entry.type : 'job',
      title: text(entry.title, 200),
      organization: text(entry.organization, 120),
      post_name: text(entry.post_name, 200),
      short_info: text(entry.short_info, 500),
      apply_start: date(entry.apply_start),
      last_date: date(entry.last_date),
      exam_date: date(entry.exam_date),
      total_vacancy: count(entry.total_vacancy),
      age_limit: text(entry.age_limit, 120),
      qualification: text(entry.qualification, 300),
      fee_info: text(entry.fee_info, 500),
      important_links: links,
    },
  };
}

/* Pure planning step, so it can be tested without a database. */
export function planImport({ seed = [], rejectUrls = [], rows = [], now = new Date() }) {
  const ops = [];
  const skipped = [];
  const touched = new Set();
  const byUrl = new Map();
  for (const row of rows) byUrl.set(row.url, [...(byUrl.get(row.url) || []), row]);

  for (const entry of seed) {
    const { fields, error } = seedFields(entry);
    if (error) { skipped.push(`${entry.url || '(no url)'}: ${error}`); continue; }
    const matches = byUrl.get(entry.url) || [];
    if (!matches.length) {
      ops.push({
        op: 'insert',
        fields: {
          ...fields,
          fingerprint: createHash('sha1').update(`seed::${entry.url.toLowerCase()}`).digest('hex'),
          source_id: 'seed',
          source_name: text(entry.source_name, 120) || fields.organization || 'Official',
          raw_title: fields.title,
          url: entry.url,
          status: 'published',
          published_at: now.toISOString(),
        },
      });
      continue;
    }
    for (const row of matches) {
      touched.add(row.id);
      if (row.status === 'published') continue; // keep edits made in /admin
      ops.push({
        op: 'update',
        id: row.id,
        fields: {
          ...fields,
          status: 'published',
          published_at: row.published_at || now.toISOString(),
          slug: row.slug || `${slugify(fields.title)}-${row.id}`,
        },
      });
    }
  }

  const rejects = new Set(rejectUrls);
  for (const row of rows) {
    if (touched.has(row.id) || row.status !== 'pending' || !rejects.has(row.url)) continue;
    touched.add(row.id);
    ops.push({ op: 'update', id: row.id, fields: { status: 'rejected' } });
  }

  for (const row of rows) {
    if (touched.has(row.id) || row.status !== 'pending') continue;
    const fields = autoFields(row, now);
    if (fields.status === 'pending') continue;
    if (fields.status === 'published') fields.slug = row.slug || `${slugify(fields.title)}-${row.id}`;
    ops.push({ op: 'update', id: row.id, fields });
  }
  return { ops, skipped };
}

async function loadRows(db) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('posts').select(ROW_FIELDS).order('id').range(from, from + 999);
    if (error) throw new Error(`DB: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function main() {
  const dry = process.argv.includes('--dry');
  const read = (file) => JSON.parse(readFileSync(new URL(`../seed/${file}`, import.meta.url), 'utf8'));
  const seed = read('jobs.json');
  const rejectUrls = read('reject-urls.json');

  const { SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key } = process.env;
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY env missing.');
    process.exit(1);
  }
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { ops, skipped } = planImport({ seed, rejectUrls, rows: await loadRows(db) });
  const tally = { insert: 0, published: 0, rejected: 0 };
  for (const op of ops) {
    if (op.op === 'insert') tally.insert++;
    else tally[op.fields.status] = (tally[op.fields.status] || 0) + 1;
  }
  console.log(`seed entries: ${seed.length}, reject urls: ${rejectUrls.length}`);
  console.log(`planned: ${tally.insert} new published, ${tally.published} pending->published, ${tally.rejected} ->rejected`);
  skipped.forEach((line) => console.warn(`skipped ${line}`));
  if (dry) return;

  for (const op of ops) {
    if (op.op === 'insert') {
      const { data, error } = await db.from('posts').insert(op.fields).select('id').single();
      if (error) throw new Error(`DB insert ${op.fields.url}: ${error.message}`);
      const { error: slugError } = await db
        .from('posts')
        .update({ slug: `${slugify(op.fields.title)}-${data.id}` })
        .eq('id', data.id);
      if (slugError) throw new Error(`DB slug ${data.id}: ${slugError.message}`);
    } else {
      const { error } = await db.from('posts').update(op.fields).eq('id', op.id);
      if (error) throw new Error(`DB update ${op.id}: ${error.message}`);
    }
  }
  console.log('import done');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
