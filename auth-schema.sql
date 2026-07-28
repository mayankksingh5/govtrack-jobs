-- Authentication/user-management tables only. Existing portal tables are unchanged.

create table if not exists user_profiles (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  name                     text,
  email                    text not null,
  avatar_url               text,
  qualification            text,
  skills                   text[] not null default '{}',
  preferred_states         text[] not null default '{}',
  preferred_organizations  text[] not null default '{}',
  role                     text not null default 'user' check (role in ('user', 'admin')),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists user_job_activity (
  user_id       uuid not null references auth.users(id) on delete cascade,
  job_id        bigint not null references posts(id) on delete cascade,
  activity      text not null check (activity in ('saved', 'viewed', 'applied')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, job_id, activity)
);

create index if not exists user_job_activity_recent_idx
  on user_job_activity (user_id, activity, updated_at desc);

create or replace function create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_profile_created on auth.users;
create trigger auth_user_profile_created
  after insert on auth.users
  for each row execute function create_user_profile();

alter table user_profiles enable row level security;
alter table user_job_activity enable row level security;

-- API service-role access only. No anonymous/public table policies.
