-- Community Q&A on job pages. Run once in Supabase -> SQL Editor.
-- Visitors ask without an account; a question shows on the site only after
-- an admin approves it (optionally with an answer) in /admin/questions.

create table if not exists job_questions (
  id           bigserial primary key,
  job_id       bigint      not null references posts(id) on delete cascade,
  name         text        not null check (char_length(name) between 2 and 60),
  message      text        not null check (char_length(message) between 5 and 1000),
  answer       text        check (answer is null or char_length(answer) <= 2000),
  status       text        not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  answered_at  timestamptz
);

create index if not exists job_questions_job_idx
  on job_questions (job_id, status, created_at desc);

create index if not exists job_questions_pending_idx
  on job_questions (created_at desc) where status = 'pending';

-- No public policies: the API uses the service role and only ever returns
-- approved questions to visitors.
alter table job_questions enable row level security;
