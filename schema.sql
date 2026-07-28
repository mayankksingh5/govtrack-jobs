-- ============================================================
--  Sarkari Result style site  --  Supabase / Postgres schema
--  Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

create extension if not exists pg_trgm;

-- ------------------------------------------------------------
-- posts : har notification ek row (job / admit card / result)
-- ------------------------------------------------------------
create table if not exists posts (
  id            bigserial primary key,

  -- dedupe key: sha1(source_id + canonical_url). Scraper isi pe
  -- upsert karta hai, isliye same link dobara insert nahi hoga.
  fingerprint   text        not null unique,

  -- scraper se aane wale raw fields
  source_id     text        not null,
  source_name   text        not null,
  raw_title     text        not null,
  url           text        not null,
  type          text        not null default 'other'
                check (type in ('job','admit_card','result','answer_key','other')),

  -- workflow: naya item hamesha 'pending'. Aap admin me review
  -- karke 'published' karoge. Isse galat/duplicate news live
  -- nahi jayegi -- Google trust ke liye ye zaroori hai.
  status        text        not null default 'pending'
                check (status in ('pending','published','rejected')),

  -- editorial fields (approve karte waqt bharo)
  slug          text        unique,
  title         text,                 -- SEO title, raw_title se better
  organization  text,                 -- "SSC", "UPPSC", "RRB"
  post_name     text,                 -- "Constable GD", "CGL 2026"
  short_info    text,
  body_html     text,

  apply_start   date,
  last_date     date,
  exam_date     date,
  total_vacancy int,
  age_limit     text,
  qualification text,
  fee_info      text,

  -- [{"label":"Apply Online","url":"..."},{"label":"Official Notification","url":"..."}]
  important_links jsonb    not null default '[]'::jsonb,

  views         int         not null default 0,
  is_featured   boolean     not null default false,

  first_seen_at timestamptz not null default now(),
  published_at  timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists posts_status_type_idx
  on posts (status, type, published_at desc nulls last);

create index if not exists posts_pending_idx
  on posts (first_seen_at desc) where status = 'pending';

create index if not exists posts_slug_idx on posts (slug);

create index if not exists posts_search_idx
  on posts using gin ((coalesce(title, raw_title)) gin_trgm_ops);

-- auto updated_at
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists posts_touch on posts;
create trigger posts_touch before update on posts
  for each row execute function touch_updated_at();


-- ------------------------------------------------------------
-- scrape_runs : har cron run ka log. Debugging ke liye gold.
-- Agar koi source silently tootha to yahan dikh jayega.
-- ------------------------------------------------------------
create table if not exists scrape_runs (
  id          bigserial primary key,
  source_id   text        not null,
  ok          boolean     not null,
  links_found int         not null default 0,
  new_items   int         not null default 0,
  error       text,
  ms          int,
  ran_at      timestamptz not null default now()
);

create index if not exists scrape_runs_recent_idx
  on scrape_runs (source_id, ran_at desc);


-- ------------------------------------------------------------
-- Row Level Security
-- Public (anon key) sirf published posts padh sakta hai.
-- Scraper aur admin service_role key use karte hain jo RLS bypass
-- karti hai -- isliye wo key kabhi frontend me mat daalna.
-- ------------------------------------------------------------
alter table posts enable row level security;
alter table scrape_runs enable row level security;

drop policy if exists "public reads published" on posts;
create policy "public reads published" on posts
  for select using (status = 'published');

-- scrape_runs pe koi public policy nahi = anon ko kuch nahi dikhega.


-- ------------------------------------------------------------
-- View counter (RPC) -- frontend se safely call kar sakte ho
-- ------------------------------------------------------------
create or replace function bump_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update posts set views = views + 1
  where slug = p_slug and status = 'published';
$$;

grant execute on function bump_views(text) to anon, authenticated;
