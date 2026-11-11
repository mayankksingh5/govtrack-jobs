import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function loadArticles() {
  const entries = JSON.parse(readFileSync(new URL('../content/blog/posts.json', import.meta.url), 'utf8'));
  const seen = new Set();
  return entries.map((entry) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) || seen.has(entry.slug)) throw new Error('Invalid or duplicate blog slug');
    seen.add(entry.slug);
    if (typeof entry.title !== 'string' || entry.title.length < 5 || entry.title.length > 200) throw new Error('Invalid blog title');
    if (typeof entry.excerpt !== 'string' || entry.excerpt.length > 300) throw new Error('Invalid blog excerpt');
    if (!Array.isArray(entry.tags) || entry.tags.some((tag) => typeof tag !== 'string')) throw new Error('Invalid blog tags');
    const body = readFileSync(new URL(`../content/blog/${entry.slug}.md`, import.meta.url), 'utf8').trim();
    if (!body) throw new Error(`Empty article: ${entry.slug}`);
    return { slug: entry.slug, title: entry.title, excerpt: entry.excerpt, tags: entry.tags, body, status: 'published' };
  });
}

export async function publishArticles(db, articles, now = new Date()) {
  // Ignore existing slugs atomically: reruns preserve admin edits and unpublishing.
  const rows = articles.map((article) => ({ ...article, published_at: now.toISOString() }));
  const { data, error } = await db.from('blog_posts').upsert(rows, { onConflict: 'slug', ignoreDuplicates: true }).select('slug');
  if (error) throw new Error(`Blog import failed: ${error.message}`);
  return data;
}

async function main() {
  const articles = loadArticles();
  if (process.argv.includes('--dry')) {
    console.log(`Validated ${articles.length} article(s): ${articles.map((post) => post.slug).join(', ')}`);
    return;
  }
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY secrets are required');
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const inserted = await publishArticles(db, articles);
  console.log(`Published ${inserted.length} new article(s); existing articles preserved.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
