# Automated Test Report

Generated: 2026-07-29

## Result

| Suite | Test files | Tests | Result |
|---|---:|---:|---|
| Backend unit, integration, and API | 3 | 19 | Passed |
| Public portal component and route | 5 | 14 | Passed |
| Admin panel component and route | 4 | 10 | Passed |
| Playwright end-to-end | 2 | 6 | Passed |
| **Total** | **14** | **49** | **Passed** |

## Coverage

Coverage is enforced for the core modules selected in each Vitest
configuration.

| Target | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Backend core | 100% | 92.72% | 100% | 100% |
| Public portal core | 100% | 94.87% | 100% | 100% |
| Admin panel core | 97.87% | 95% | 95% | 97.22% |

All configured targets exceed the requested 90% line, statement, and function
coverage goal. Detailed browsable reports are available in:

- `coverage/backend/index.html`
- `coverage/public/index.html`
- `coverage/admin/index.html`

## Scenarios Covered

- Authentication registration, login, protected routes, and validation
- Personalized and similar-job recommendation scoring
- Search, pagination, category filters, and job details
- Saved jobs, applied jobs, and profile pages
- Admin login, dashboard, jobs, and statistics
- API validation, structured 404 responses, and safe 500 responses
- Frontend loading, error, empty, and not-found states

## Generated Reports

- `test-reports/backend-junit.xml`
- `test-reports/public-junit.xml`
- `test-reports/admin-junit.xml`
- `test-reports/e2e-junit.xml`
- `playwright-report/index.html`

The GitHub Actions workflow executes all suites, enforces coverage, builds both
frontends, and uploads reports and browser artifacts even when a test fails.
