-- Recommendation-only schema. Does not alter existing portal tables.

create table if not exists job_user_preferences (
  user_id                  uuid primary key,
  qualification            text,
  skills                   text[] not null default '{}',
  experience_years         int check (experience_years is null or experience_years >= 0),
  preferred_states         text[] not null default '{}',
  preferred_organizations  text[] not null default '{}',
  preferred_categories     text[] not null default '{}',
  preferred_salary_min     numeric check (preferred_salary_min is null or preferred_salary_min >= 0),
  preferred_salary_max     numeric check (preferred_salary_max is null or preferred_salary_max >= 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (
    preferred_salary_min is null
    or preferred_salary_max is null
    or preferred_salary_min <= preferred_salary_max
  )
);

create table if not exists job_interactions (
  id              bigserial primary key,
  user_id         uuid not null,
  job_id          bigint not null references posts(id) on delete cascade,
  interaction     text not null check (interaction in ('viewed', 'saved')),
  occurred_at     timestamptz not null default now()
);

create index if not exists job_interactions_user_recent_idx
  on job_interactions (user_id, occurred_at desc);

create index if not exists job_interactions_job_type_idx
  on job_interactions (job_id, interaction);

create unique index if not exists job_interactions_saved_unique_idx
  on job_interactions (user_id, job_id, interaction)
  where interaction = 'saved';

alter table job_user_preferences enable row level security;
alter table job_interactions enable row level security;

-- No public policies: these tables are accessed only by the API's service role.
