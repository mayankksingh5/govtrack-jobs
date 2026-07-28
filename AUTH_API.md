# Authentication and User Management

Supabase Auth provides password hashing, JWT access tokens, rotating refresh
tokens, email verification, and recovery emails. The Express API stores refresh
tokens only in HTTP-only cookies and returns short-lived access tokens to the
React clients.

## Setup

1. Run `auth-schema.sql` in Supabase after the existing `schema.sql`.
2. If recommendations are enabled, also run `recommendation-schema.sql`.
3. Configure the API environment:

   ```text
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   PASSWORD_RESET_REDIRECT_URL=http://localhost:5174/reset-password
   EMAIL_VERIFICATION_REDIRECT_URL=http://localhost:5174/login
   COOKIE_SECURE=false
   COOKIE_SAME_SITE=lax
   AUTH_RATE_LIMIT_MAX=20
   CORS_ORIGIN=http://localhost:5174,http://localhost:5173
   ```

4. In production, use HTTPS and set `COOKIE_SECURE=true`. Use
   `COOKIE_SAME_SITE=none` only when the API and frontend are genuinely
   cross-site.
5. Add the public portal URL to Supabase Authentication → URL Configuration →
   Redirect URLs. Configure the email verification and password recovery email
   templates in Supabase.

Never expose `SUPABASE_SERVICE_KEY` in either Vite application.

## Authentication endpoints

### POST `/api/auth/register`

```json
{
  "name": "Asha Sharma",
  "email": "asha@example.com",
  "password": "StrongPass123"
}
```

Passwords must be 10–128 characters and contain upper-case, lower-case, and
numeric characters. Supabase hashes the password. When email confirmation is
enabled, `email_verification_required` is `true` and no session is issued until
the verification link is completed.

### POST `/api/auth/login`

```json
{
  "email": "asha@example.com",
  "password": "StrongPass123"
}
```

The response contains the JWT access token. The rotating refresh token is set
as an HTTP-only cookie.

### POST `/api/auth/refresh`

Uses the HTTP-only refresh cookie. Returns a new access token and rotates the
refresh cookie.

### POST `/api/auth/logout`

Accepts the access token and clears/revokes the local session.

```http
Authorization: Bearer <access-token>
```

### POST `/api/auth/forgot-password`

```json
{ "email": "asha@example.com" }
```

Always returns a neutral response to prevent account enumeration.

### POST `/api/auth/reset-password`

```json
{
  "access_token": "<recovery-access-token>",
  "password": "NewStrongPass123"
}
```

The public reset page reads the recovery token from the Supabase redirect URL.

## Profile endpoints

All profile and user-job endpoints require:

```http
Authorization: Bearer <access-token>
```

### GET `/api/profile`

Returns name, email, avatar, qualification, skills, states, organizations, and
role.

### PUT `/api/profile`

```json
{
  "name": "Asha Sharma",
  "avatar_url": "https://example.com/avatar.jpg",
  "qualification": "B.Tech",
  "skills": ["AutoCAD", "Civil Engineering"],
  "preferred_states": ["Delhi", "Rajasthan"],
  "preferred_organizations": ["ISRO", "RBI"]
}
```

Profile preferences are synchronized to the existing recommendation preference
record for the same authenticated UUID.

## User job endpoints

```text
POST   /api/user/jobs/:jobId/saved
POST   /api/user/jobs/:jobId/viewed
POST   /api/user/jobs/:jobId/applied
DELETE /api/user/jobs/:jobId/saved
GET    /api/user/jobs/saved?page=1&limit=20
GET    /api/user/jobs/recent?page=1&limit=20
GET    /api/user/jobs/applied?page=1&limit=20
```

Saved/viewed actions also provide signals to the recommendation interaction
history without changing the recommendation algorithm.

## Roles and admin access

New accounts receive the `user` role. Promote an account only through a trusted
Supabase SQL/admin process:

```sql
update user_profiles
set role = 'admin', updated_at = now()
where email = 'admin@example.com';
```

The admin React application requires an authenticated profile with role
`admin`. Recommendation analytics are also protected server-side with the admin
role middleware.

## Database changes

`auth-schema.sql` creates only:

- `user_profiles`;
- `user_job_activity`;
- a trigger that creates a profile for new `auth.users`;
- recommendation-safe indexes and RLS settings.

It does not alter `posts`, `scrape_runs`, or scraper behavior.

## Security notes

- Access tokens stay in JavaScript memory, not local storage.
- Refresh tokens are HTTP-only cookies.
- Refresh tokens rotate through Supabase Auth.
- Auth endpoints have a stricter rate limit.
- Inputs are length/type validated.
- Profile and activity tables have RLS enabled and no public policies.
- Service-role credentials remain server-only.
- Admin UI checks are backed by server-side role checks for admin analytics.
