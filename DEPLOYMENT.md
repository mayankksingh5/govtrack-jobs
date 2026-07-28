# Production Deployment

This repository deploys as three independent services:

- Express API on Render, using the repository root.
- Public Vite portal on Vercel, using `public-portal` as its root directory.
- Admin Vite panel on Vercel, using `admin-panel` as its root directory.

Use custom domains such as `api.jobs.example.com`, `jobs.example.com`, and
`admin.jobs.example.com` when possible. Keeping them under one parent domain
reduces cross-site cookie restrictions.

## 1. Prepare Supabase

Create the existing application tables using the repository's existing SQL
files. This deployment work does not change any schema. In Supabase Auth:

1. Set the Site URL to the production public portal URL.
2. Add the public login and reset URLs to the redirect allow list.
3. Keep the service-role key server-side. Never create a `VITE_` variable
   containing the service-role key.
4. Create or promote one profile to the existing `admin` role before testing
   the admin panel.

## 2. Deploy the API to Render

### Blueprint deployment

1. Push the repository to GitHub.
2. In Render, select **New > Blueprint** and connect the repository.
3. Render reads `render.yaml` and creates `government-jobs-api`.
4. Enter every variable marked `sync: false`.
5. Deploy and wait for the `/health` check to pass.

### Required Render variables

Copy names from `.env.production.example`:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Authentication client key |
| `SUPABASE_SERVICE_KEY` | Server-only database/admin key |
| `CORS_ORIGIN` | Exact comma-separated public and admin HTTPS origins |
| `PASSWORD_RESET_REDIRECT_URL` | Public portal reset-password URL |
| `EMAIL_VERIFICATION_REDIRECT_URL` | Public portal login URL |
| `NODE_ENV` | Must be `production` |
| `TRUST_PROXY` | Must be `true` behind Render |
| `COOKIE_SECURE` | Must be `true` |
| `COOKIE_SAME_SITE` | Use `none` for separate Vercel/Render sites |

Do not include trailing slashes or paths in `CORS_ORIGIN`. Production startup
fails immediately when required variables are absent, CORS contains `*`, or a
frontend origin is not HTTPS.

The production command is:

```bash
npm start
```

Render sends health checks to:

```text
GET /health
```

The API logs startup, shutdown, request method, path, status, duration, and
timestamp as JSON to stdout, where Render captures it.

## 3. Deploy the public portal to Vercel

1. Import the same repository as a new Vercel project.
2. Set **Root Directory** to `public-portal`.
3. Keep the detected Vite build settings; `vercel.json` explicitly uses
   `npm run build` and `dist`.
4. Add production variables:

```dotenv
VITE_API_URL=https://api.jobs.example.com
VITE_SITE_URL=https://jobs.example.com
```

5. Deploy, then add its exact production origin to Render's `CORS_ORIGIN`.
6. Redeploy Render after changing its environment.

The build generates production-aware `robots.txt` and `sitemap.xml` from
`VITE_SITE_URL`. React Helmet supplies page titles, descriptions, canonical
URLs, Open Graph/Twitter metadata, and JobPosting structured data. The SPA
rewrite makes direct visits such as `/jobs/123` resolve to `index.html`.

After attaching the final domain, rebuild the portal so canonical URLs and the
sitemap contain the final hostname.

## 4. Deploy the admin panel to Vercel

1. Import the repository as a second Vercel project.
2. Set **Root Directory** to `admin-panel`.
3. Add production variables:

```dotenv
VITE_API_URL=https://api.jobs.example.com
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

4. Deploy and add its exact origin to Render's `CORS_ORIGIN`.

All operational routes remain wrapped by the existing `ProtectedAdmin`
component. The API independently enforces the admin role for protected
analytics endpoints. Vercel adds `X-Robots-Tag: noindex, nofollow` to prevent
admin pages appearing in search.

## 5. Verify the deployment

Set the three deployed URLs and run the automated smoke test:

### PowerShell

```powershell
$env:BACKEND_URL='https://api.jobs.example.com'
$env:PUBLIC_URL='https://jobs.example.com'
$env:ADMIN_URL='https://admin.jobs.example.com'
npm run verify:deployment
```

This verifies HTTPS URLs, API health, both frontend entry points, credentialed
CORS preflights, authentication protection, and recommendations. To test a
real login, profile request, and admin authorization, additionally provide a
dedicated test admin account:

```powershell
$env:TEST_EMAIL='deployment-check@example.com'
$env:TEST_PASSWORD='use-a-secret-from-your-password-manager'
npm run verify:deployment
```

Never store those credentials in the repository.

### Manual checklist

- [ ] `https://<api>/health` returns HTTP 200 and `status: "ok"`.
- [ ] Public homepage, search, pagination, job details, and recommendations load.
- [ ] Registration and email verification complete successfully.
- [ ] Login survives a page refresh, proving the secure refresh cookie works.
- [ ] Save, applied, and profile operations work.
- [ ] Non-admin users cannot open admin routes or analytics.
- [ ] An admin can log in and load dashboard statistics.
- [ ] Browser network responses contain the exact `Access-Control-Allow-Origin`.
- [ ] All three services use valid HTTPS without mixed-content errors.
- [ ] `/robots.txt`, `/sitemap.xml`, canonical tags, and JobPosting JSON-LD use
      the production public hostname.
- [ ] Render logs show JSON request events without tokens, cookies, or query data.

## Common deployment issues

### CORS error in the browser

Use origins only, for example `https://jobs.example.com`, and list both
frontends separated by commas. Do not add paths or trailing slashes. Preview
deployments have different origins; either add a stable preview/branch domain
explicitly or test previews against a staging API.

### Login works but refresh logs the user out

Confirm HTTPS, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, the correct
frontend origin in `CORS_ORIGIN`, and `withCredentials` on browser requests.
Some browsers restrict third-party cookies; custom subdomains under the same
parent domain are the most reliable setup.

### Authentication redirect rejected

The Render redirect variables and Supabase Auth redirect allow list must match
the public portal URLs exactly.

### Render startup fails

Read the first log entry. Production validation names missing variables and
rejects wildcard/non-HTTPS CORS settings. Ensure the service uses the repository
root and runs `npm start`.

### Frontend still calls localhost

`VITE_` variables are embedded at build time. Set them for Vercel's Production
environment and redeploy; changing them does not update an existing deployment.

### Direct route returns 404

Confirm the Vercel project root contains its `vercel.json` and redeploy. Both
projects include an SPA fallback to `index.html`.

### SEO files contain the example domain

Set `VITE_SITE_URL` in the public project's Production environment and rebuild.
Inspect the deployed `/robots.txt`, `/sitemap.xml`, and canonical link.
