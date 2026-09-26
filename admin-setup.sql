-- Make an existing account an admin so it can use /admin on the website.
-- 1. Register on the website first (/register) and verify the email.
-- 2. Run auth-schema.sql once if the user_profiles table does not exist yet.
-- 3. Replace the email below with your own and run this in
--    Supabase Dashboard -> SQL Editor.

insert into public.user_profiles (user_id, email, name, role)
select id, email, coalesce(raw_user_meta_data ->> 'name', email), 'admin'
from auth.users
where email = 'YOUR-EMAIL@example.com'
on conflict (user_id) do update set role = 'admin', updated_at = now();

-- Check: this should return one row with role = admin.
select user_id, email, role from public.user_profiles where role = 'admin';
