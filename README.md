# Government Job Portal

A production-oriented platform for collecting official Indian government job
notifications and presenting them through a public portal, an administration
dashboard, and a REST API.

The project includes generic link harvesting, source health diagnostics,
duplicate detection, PDF metadata extraction, authentication, saved and applied
jobs, rule-based recommendations, deployment manifests, and automated tests.

## Architecture

| Component | Technology | Directory |
|---|---|---|
| Scraper and diagnostics | Node.js, Cheerio | repository root |
| REST API | Express, Supabase | `api/` |
| Public portal | React, Vite, Tailwind CSS | `public-portal/` |
| Admin panel | React, Vite, Tailwind CSS, Chart.js | `admin-panel/` |
| Source health dashboard | HTML, CSS, JavaScript | `dashboard/` |
| Automated tests | Vitest, Testing Library, Supertest, Playwright | `tests/` and frontend source trees |

Supabase provides the PostgreSQL database and authentication service. The API
is prepared for Render, while both Vite applications are prepared for Vercel.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project
- Git

## Local setup

Install each independent Node project:

```bash
npm install
npm --prefix public-portal install
npm --prefix admin-panel install
```

Create local environment files from the committed examples:

```bash
cp .env.example .env
cp public-portal/.env.example public-portal/.env
cp admin-panel/.env.example admin-panel/.env
```

Never commit the resulting `.env` files. Populate the backend file with your
Supabase project URL and keys. The service-role key must remain server-side and
must never be exposed through a `VITE_` variable.

Apply the existing SQL files in Supabase as described in
[AUTH_API.md](AUTH_API.md) and [RECOMMENDATION_API.md](RECOMMENDATION_API.md).

## Running locally

Start the API:

```bash
npm run api
```

Start the public portal:

```bash
npm --prefix public-portal run dev
```

Start the admin panel:

```bash
npm --prefix admin-panel run dev
```

The default local addresses are:

- API: `http://localhost:3000`
- Public portal: `http://localhost:5174`
- Admin panel: `http://localhost:5173`

## Scraper commands

Full production scraper setup is documented in
[SCRAPER_RUNBOOK.md](SCRAPER_RUNBOOK.md).

Discover links without writing data:

```bash
npm run discover -- <source-id>
```

Run the scraper:

```bash
npm run scrape
```

Useful source validation commands:

```bash
node diagnose.js <source-id>
node scraper.js --discover <source-id>
node scraper.js --only <source-id> --dry
```

New finds are published automatically by the rules in `auto-publish.js`:
finds that mention only past years are stored as `rejected`, finds with a
generic title ("Click here…") stay `pending` for an admin, and everything else
is published with its official title and link. The generic harvesting strategy
is deliberate; source-specific overrides (including `exclude` patterns) are
configured in `sources.json`.

## Publishing jobs

- **Automatic:** the `scrape` workflow runs every 2 hours and publishes new
  finds as described above.
- **Hand-checked jobs:** add entries to `seed/jobs.json` (and old URLs to
  `seed/reject-urls.json`). When the change reaches `main`, the `import-seed`
  workflow publishes them and applies the same rules to anything still
  pending. Rows already published are never overwritten, so edits made in
  `/admin` are kept.
- **Admin:** `/admin` lists pending, published and rejected posts with
  Source / Reject / Review actions; `/admin/questions` moderates visitor
  questions shown on job pages.
- **One-time setup for questions:** run `migrations/2026-09-26-job-questions.sql`
  in the Supabase SQL Editor.

## API

The main endpoints include:

- `GET /health`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/search`
- `GET /api/latest`
- `GET /api/statistics`
- `/api/auth/*`
- `/api/profile`
- `/api/user/jobs/*`
- `/api/recommendations/*`

API responses use structured success and error objects. Authentication uses
short-lived access tokens and an HTTP-only refresh cookie.

See [AUTH_API.md](AUTH_API.md) and
[RECOMMENDATION_API.md](RECOMMENDATION_API.md) for detailed contracts.

## Testing

Run the complete suite:

```bash
npm run test:all
```

Individual commands:

```bash
npm run test:coverage
npm --prefix public-portal run test:coverage
npm --prefix admin-panel run test:coverage
npm run test:e2e
```

The GitHub Actions test workflow runs backend, component, route, production
build, and Playwright tests. See [TESTING.md](TESTING.md) and
[TEST_REPORT.md](TEST_REPORT.md).

## Production deployment

Production configuration is documented in [DEPLOYMENT.md](DEPLOYMENT.md).

- `render.yaml` provisions the Express API on Render.
- `public-portal/vercel.json` configures the public SPA on Vercel.
- `admin-panel/vercel.json` configures the protected admin SPA on Vercel.
- `.env.production.example` files document required production variables.

After deployment, run:

```bash
npm run verify:deployment
```

## Security

- Environment and secret files are ignored by Git.
- Supabase service credentials are used only by server-side code.
- Production startup rejects missing credentials, wildcard CORS, and insecure
  frontend origins.
- Authentication and API endpoints are rate-limited and input-validated.
- Refresh tokens use HTTP-only secure cookies in production.
- The API uses Helmet, compression, explicit CORS origins, and structured
  error handling.
- New jobs require human review before publication.

If you discover a vulnerability, report it privately to the repository owner
instead of opening a public issue containing exploit details or credentials.

## Project documentation

- [DEPLOYMENT.md](DEPLOYMENT.md)
- [PROJECT_AUDIT.md](PROJECT_AUDIT.md)
- [SCRAPER_RUNBOOK.md](SCRAPER_RUNBOOK.md)
- [SOURCES_REPORT.md](SOURCES_REPORT.md)
- [CLI_HELP.md](CLI_HELP.md)
- [AUTH_API.md](AUTH_API.md)
- [RECOMMENDATION_API.md](RECOMMENDATION_API.md)
- [TESTING.md](TESTING.md)

## License

Released under the [MIT License](LICENSE).
