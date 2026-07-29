# Scraper Runbook

Use the existing scraper to collect official notifications and insert them into
the production Supabase `public.posts` table.

## Required Environment Variables

The scraper writes directly to Supabase with the server-side service role key.
Set these variables in the shell or secure job runner that runs the scraper:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
```

Do not expose `SUPABASE_SERVICE_KEY` in either frontend application and do not
prefix it with `VITE_`.

Optional Telegram notification variables:

```bash
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

## Validate Sources Without Writing

Discover a single source:

```bash
npm run discover -- isro
```

Run one source without database writes:

```bash
node scraper.js --only isro --dry
```

Run every enabled source without database writes:

```bash
node scraper.js --dry
```

## Populate `public.posts`

Run one known-working source:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_KEY=your-supabase-service-role-key \
node scraper.js --only isro
```

On PowerShell:

```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_KEY="your-supabase-service-role-key"
node scraper.js --only isro
```

Run every enabled source:

```bash
npm run scrape
```

The scraper inserts into `public.posts` with:

- `fingerprint` generated from source ID and canonical URL
- `source_id`
- `source_name`
- `raw_title`
- `url`
- `type`

It does not set `status`, so the database default remains `pending`.

## Duplicate Handling

The scraper avoids duplicate records by:

- checking identical official URLs
- checking identical apply/important-link URLs
- checking highly similar titles for the same organization
- upserting with `onConflict: 'fingerprint'`

When a duplicate is found, the existing row is updated with a fresh
`updated_at` timestamp and the duplicate is logged in `logs/duplicates.json`.

## Publish Pending Jobs

New scraped rows are intentionally not public immediately. The public API only
returns rows where:

```sql
status = 'published'
```

Review pending rows:

```sql
select id, source_name, raw_title, url, type, first_seen_at
from public.posts
where status = 'pending'
order by first_seen_at desc;
```

Publish a reviewed job:

```sql
update public.posts
set
  status = 'published',
  title = coalesce(title, raw_title),
  slug = coalesce(slug, lower(regexp_replace(raw_title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || id),
  published_at = coalesce(published_at, now())
where id = 123;
```

After publishing, verify from the deployed API:

```bash
curl https://jobportal-h61c.vercel.app/api/jobs
```

## Troubleshooting

If the scraper exits with:

```text
SUPABASE_URL / SUPABASE_SERVICE_KEY env missing.
```

set both required variables in the same shell session or job runner before
running `npm run scrape`.

If inserted rows do not appear in `/api/jobs`, confirm the rows have
`status = 'published'`. Pending rows are visible only in the database/admin
review workflow.
