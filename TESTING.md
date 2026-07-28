# Automated Testing

The project uses Vitest for backend and frontend tests, Testing Library for
React behavior, Supertest for HTTP API tests, and Playwright for browser tests.
Tests do not require a live database: external API and persistence boundaries
are isolated or mocked.

## Commands

```bash
# Backend unit, integration, and API tests
npm test
npm run test:coverage

# Public portal component and route tests
npm --prefix public-portal test
npm --prefix public-portal run test:coverage

# Admin panel component and route tests
npm --prefix admin-panel test
npm --prefix admin-panel run test:coverage

# Browser tests (install Chromium once first)
npx playwright install chromium
npm run test:e2e

# Full local suite
npm run test:all
```

Coverage HTML is written to `coverage/backend`, `public-portal/coverage`, and
`admin-panel/coverage`. JUnit test reports are written under each project's
`test-reports` directory. Playwright's HTML report is written to
`playwright-report`.

## Coverage policy

Core modules directly exercised by the suite enforce at least 90% line,
function, and statement coverage. Branch coverage has an 80–85% floor to
account for defensive browser and platform fallbacks. The GitHub workflow
fails when these thresholds regress.

## End-to-end strategy

Playwright starts production previews of both React applications. Network
requests to the existing REST API are deterministically mocked, allowing the
tests to cover authentication, jobs, filters, pagination, saved jobs, applied
jobs, profiles, recommendations, admin login, dashboards, validation, and
not-found states without changing application behavior or requiring seed data.
