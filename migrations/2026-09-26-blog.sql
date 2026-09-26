-- Blog articles written by the admin (exam tips, job explainers, updates).
-- Run once in Supabase -> SQL Editor. Safe to run again.

create table if not exists blog_posts (
  id               bigserial primary key,
  slug             text        not null unique,
  title            text        not null check (char_length(title) between 5 and 200),
  excerpt          text        check (excerpt is null or char_length(excerpt) <= 300),
  body             text        not null default '',          -- Markdown
  cover_image_url  text        check (cover_image_url is null or cover_image_url ~* '^https://'),
  tags             text[]      not null default '{}',
  related_job_id   bigint      references posts(id) on delete set null,
  status           text        not null default 'draft' check (status in ('draft', 'published')),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists blog_posts_published_idx
  on blog_posts (published_at desc) where status = 'published';

drop trigger if exists blog_posts_touch on blog_posts;
create trigger blog_posts_touch before update on blog_posts
  for each row execute function touch_updated_at();

-- No public policies: the API uses the service role and only returns
-- published articles to visitors.
alter table blog_posts enable row level security;
