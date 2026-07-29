# Backend Deployment

## Target decision

The backend is prepared primarily for a separate **Vercel Hobby** project.
The public and admin Vercel projects remain unchanged.

Koyeb was evaluated first and Northflank second, as requested. As of
2026-07-29, neither satisfies the no-credit-card requirement:

- Koyeb's official pricing FAQ says it requires a credit card for fraud
  prevention and places a temporary authorization hold.
- Northflank's official billing documentation says every user must add a
  payment method before creating resources, including Sandbox resources.

Vercel Hobby is therefore the practical no-card target because the existing
Vercel account is already active, Express is supported directly, and Hobby has
no billing cycle. Hobby is intended for personal, non-commercial, small-scale
applications and has usage caps. If the portal is commercial or requires an
availability guarantee, use a paid production service.

The repository remains portable to Koyeb if its account requirements are
acceptable or an existing validated account is available.

## Deployment files

- `app.js` exports the existing Express app for Vercel Functions.
- `vercel.json` explicitly selects Vercel's Express framework so the source
  modules under `api/` are bundled into the single Express Function instead of
  being interpreted as independent Functions.
- `api/server.js` remains the long-running Node entry point.
- `Procfile` declares `npm start` for buildpack platforms.
- `.koyebignore` prevents documentation and frontend-only commits from
  triggering unnecessary Koyeb deployments. It does not remove files from the
  build context.
- `.env.production.example` documents all backend settings.

A Dockerfile is intentionally not included. Both Vercel Express detection and
Koyeb's Node.js buildpack support this project natively.

Koyeb does not currently document a repository-level `koyeb.yaml` service
manifest. Service settings are configured through its control panel or CLI, so
no unsupported manifest is included.

## Required environment variables

| Variable | Required | Example or purpose |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `SUPABASE_URL` | Yes | `https://project.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public authentication key |
| `SUPABASE_SERVICE_KEY` | Yes | Server-only Supabase service-role key |
| `CORS_ORIGIN` | Yes | Exact comma-separated Vercel frontend origins |
| `PASSWORD_RESET_REDIRECT_URL` | Yes | Public portal `/reset-password` URL |
| `EMAIL_VERIFICATION_REDIRECT_URL` | Yes | Public portal `/login` URL |
| `TRUST_PROXY` | Recommended | `true` |
| `COOKIE_SECURE` | Recommended | `true` |
| `COOKIE_SAME_SITE` | Recommended | `none` for separate deployed origins |
| `RATE_LIMIT_WINDOW_MS` | Optional | Defaults to `60000` |
| `RATE_LIMIT_MAX` | Optional | Defaults to `100` |
| `AUTH_RATE_LIMIT_MAX` | Optional | Defaults to `20` |
| `PORT` | Platform | Automatically supplied by long-running hosts |

Production startup fails before accepting requests when credentials, redirect
URLs, or CORS origins are absent. Production CORS rejects wildcard and
non-HTTPS origins. Never expose `SUPABASE_SERVICE_KEY` to either frontend.

## Recommended no-card deployment: Vercel

Create a third Vercel project specifically for the API:

1. In Vercel, choose **Add New > Project**.
2. Import `raj5-10/JOBPORTAL`.
3. Leave **Root Directory** at the repository root.
4. Set the framework preset to **Express** if Vercel does not detect it.
5. Do not set an output directory.
6. Add every required environment variable from the table above to the
   Production environment.
7. Set `CORS_ORIGIN` to the exact deployed public and admin origins, without
   trailing slashes:

   ```dotenv
   CORS_ORIGIN=https://your-public.vercel.app,https://your-admin.vercel.app
   ```

8. Deploy. Vercel detects the root `app.js` export and deploys the complete
   Express application as one Function.
9. Copy the API deployment URL and update `VITE_API_URL` in both existing
   frontend Vercel projects.
10. Redeploy both frontends because Vite embeds environment variables at build
    time.
11. Add the final public URLs to Supabase Auth's redirect allow list.

Build command:

```text
Automatic Vercel Express build
```

Start command:

```text
Not applicable; Vercel invokes the exported Express application
```

Expected URL:

```text
https://<backend-project-name>.vercel.app
```

## Exact Koyeb deployment steps

Use this route only if Koyeb allows access without adding a card for your
existing account, or if its payment-method requirement is acceptable.

1. Open the Koyeb control panel and choose **Create Web Service**.
2. Select **GitHub** and authorize access to `raj5-10/JOBPORTAL`.
3. Select branch `main`.
4. Select **Buildpack**. Do not select Dockerfile.
5. Keep the work directory at the repository root.
6. Build command: leave blank. The Node.js buildpack installs dependencies.
7. Run command: leave blank to use `Procfile`, or enter:

   ```text
   npm start
   ```

8. Select service type **Web Service**.
9. Select the `free` instance explicitly. Koyeb documents one free Web Service
   per organization, in Frankfurt or Washington, D.C.
10. Expose the platform-provided `PORT` as HTTP and route `/` to it. Do not
    hardcode a different application port.
11. Add all required environment variables. Koyeb supplies `PORT`.
12. Configure an HTTP health check:

    ```text
    Method: GET
    Path: /health
    Expected status: 2xx
    ```

13. Deploy and wait for the Service status to become **Healthy**.
14. Update both Vercel frontend projects:

    ```dotenv
    VITE_API_URL=https://<app>-<organization>-<hash>.koyeb.app
    ```

15. Redeploy both frontends.

Koyeb build command:

```text
Automatic Node.js buildpack installation
```

Koyeb start command:

```text
npm start
```

Expected Koyeb URL:

```text
https://<app-name>-<organization-name>-<hash>.koyeb.app
```

Free Koyeb instances provide limited resources and scale to zero after an idle
period, so the first request after inactivity can be slow.

## Health verification

After deployment:

```bash
curl -i https://<backend-host>/health
```

Expected status:

```text
HTTP/2 200
```

Expected response:

```json
{
  "success": true,
  "total": 1,
  "page": 1,
  "pages": 1,
  "data": [{ "status": "ok" }]
}
```

Check production CORS from each frontend origin:

```bash
curl -i -X OPTIONS https://<backend-host>/api/auth/refresh \
  -H "Origin: https://<frontend-host>" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

The response must include:

```text
Access-Control-Allow-Origin: https://<frontend-host>
Access-Control-Allow-Credentials: true
```

## Common deployment issues

### Production environment validation fails

Read the first log entry. It names missing variables. Confirm values were added
to the Production environment, not only Preview or Development.

### CORS blocks the frontend

Use exact HTTPS origins with no path or trailing slash. Include both public and
admin origins, separated by commas, then redeploy the backend.

### Authentication succeeds but refresh fails

Confirm `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, exact CORS origins, and
HTTPS on every service. Also verify Supabase redirect allow-list entries.

### Frontend still calls the old API

Update `VITE_API_URL` in each frontend project and redeploy. Vite variables are
compiled into the frontend bundles.

### Koyeb deployment is unhealthy

Confirm the service exposes Koyeb's `PORT`, starts with `npm start`, and uses
`GET /health` as its HTTP health check.

### First request is slow

Free platforms may cold-start after inactivity. This is expected on Koyeb free
instances and serverless functions.

### Recommendations or authentication return configuration errors

Confirm the existing Supabase schemas have been applied and both the anon and
service-role keys belong to the same project.
