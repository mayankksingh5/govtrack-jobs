import test from 'node:test';
import assert from 'node:assert/strict';
import { loadArticles, publishArticles } from './import-blog.mjs';

test('article manifest loads complete Hindi content and official links', () => {
  const [article] = loadArticles();
  assert.equal(article.slug, 'dsssb-tgt-computer-science-exam-date-2026');
  assert.ok(article.body.includes('अक्सर पूछे जाने वाले सवाल'));
  assert.ok(article.body.includes('https://dsssb.delhi.gov.in/sites/default/files/DSSSB/circulars-orders/exam_schedule_1.pdf'));
  assert.equal(article.status, 'published');
});

test('publishing is idempotent and preserves later admin edits', async () => {
  const saved = new Map();
  const db = { from(table) {
    assert.equal(table, 'blog_posts');
    return { upsert(rows, options) {
      assert.deepEqual(options, { onConflict: 'slug', ignoreDuplicates: true });
      const added = [];
      for (const row of rows) if (!saved.has(row.slug)) { saved.set(row.slug, row); added.push({ slug: row.slug }); }
      return { select: async () => ({ data: added, error: null }) };
    } };
  } };
  const articles = loadArticles();
  assert.equal((await publishArticles(db, articles)).length, 1);
  saved.get(articles[0].slug).body = 'Admin edited this';
  saved.get(articles[0].slug).status = 'draft';
  assert.equal((await publishArticles(db, articles)).length, 0);
  assert.equal(saved.get(articles[0].slug).body, 'Admin edited this');
  assert.equal(saved.get(articles[0].slug).status, 'draft');
});

test('database errors fail publication', async () => {
  const db = { from: () => ({ upsert: () => ({ select: async () => ({ data: null, error: { message: 'table missing' } }) }) }) };
  await assert.rejects(publishArticles(db, loadArticles()), /table missing/);
});
