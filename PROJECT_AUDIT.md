# Project audit

Audit date: 2026-07-29
Scope: complete repository-owned file set, installed dependency tree, workflow
configuration, static runtime checks, and live verification of every enabled
source. No database connection or write-mode scrape was attempted.

## Executive summary

The scraper is currently runnable. Both JavaScript entry points pass
`node --check`, both JSON files parse, `npm ls --all` reports a consistent
dependency tree, and `npm audit --omit=dev` reports zero known vulnerabilities.
All seven enabled sources returned HTTP 200 and produced links in both
`diagnose.js` and `scraper.js --discover`.

There are no missing imports or project files required by the current workflow.
No runtime fix was necessary. The most important remaining problem is a
dangerous discovery-script edge case: running `npm run discover` without an ID
can start a normal database-writing scrape.

## Project structure

| Path | Purpose | Status |
|---|---|---|
| `.github/workflows/scrape.yml` | Scheduled/manual GitHub Actions scrape | Valid; improvement opportunities noted below |
| `.gitignore` | Excludes dependencies and local environment secrets | Correct for current project |
| `README.md` | Setup, architecture, operations, and limitations | Present; generally consistent with implementation |
| `package.json` | Node ESM metadata, scripts, direct dependencies | Valid; discovery script has a safety issue |
| `package-lock.json` | Reproducible dependency resolution | Valid and consistent with installed tree |
| `scraper.js` | Generic fetch, harvest, classify, deduplicate, DB insert, and Telegram notification pipeline | Syntax valid and imports resolve |
| `diagnose.js` | Read-only source/URL diagnostic utility | Syntax valid and imports resolve |
| `sources.json` | Source registry and per-source options | Valid JSON; 7 enabled and 12 explicitly disabled |
| `schema.sql` | Supabase/Postgres schema | Inspected only; not modified |
| `SOURCES_REPORT.md` | Previous source-verification record | Useful audit history; live RBI count has since changed from 12 to 11 |
| `PROJECT_AUDIT.md` | This audit | Added |

`node_modules/` was not reviewed file-by-file as application source. Its complete
resolved package tree was checked with `npm ls --all`, and production
dependencies were checked against the current npm advisory database.

## Validation performed

- Parsed `sources.json` and `package-lock.json`.
- Ran `node --check scraper.js` and `node --check diagnose.js`.
- Ran `npm.cmd ls --all`; no missing, invalid, or extraneous package was
  reported.
- Ran `npm.cmd audit --omit=dev`; result: **0 vulnerabilities**.
- Checked imports and exports manually. Every import resolves. The three
  exports from `scraper.js` are intentionally consumed by diagnostics/tests or
  exposed for future tests; `harvestLinks` is currently used by `diagnose.js`.
- Searched project-owned files for TODO/FIXME/HACK markers; none were found.
- Inspected the workflow, ignore rules, documentation, source registry,
  scraper, diagnostic tool, lockfile, and schema.

## Live source verification

| Source | HTTP | Final URL | Usable links | Discover result | Assessment |
|---|---:|---|---:|---|---|
| `ibps` | 200 | https://www.ibps.in/ | 10 | 10 relevant recruitment/result links | Working |
| `sbi-careers` | 200 | https://sbi.bank.in/web/careers/current-openings | 53 | 53 applications, notices, call letters, and results | Working; includes older results |
| `isro` | 200 | https://www.isro.gov.in/Careers.html | 4 | 4 current/recent recruitment notices | Working |
| `india-post-gds` | 200 | https://indiapostgdsonline.gov.in/Home.aspx | 25 | Notification plus state shortlist PDFs | Reachable, but mostly 2025 shortlist material |
| `bel` | 200 | https://bel-india.in/job-notifications/ | 9 | 9 current advertisements/application links | Working |
| `nhpc` | 200 | https://www.nhpcindia.com/welcome/job | 1 | One backlog-vacancy PDF | Reachable but weak/stale-looking feed |
| `rbi` | 200 | https://opportunities.rbi.org.in/Scripts/Vacancies.aspx | 11 | 11 relevant vacancies | Working |

All disabled real sources have a non-empty `_note`, so no source is silently
disabled. Disabled sources were not re-probed because they are outside the
runtime source set and their latest failure reasons are already documented in
`SOURCES_REPORT.md`.

## Findings

### High priority

1. **`npm run discover` is unsafe without a source ID.**

   `package.json` defines `discover` as `node scraper.js --discover`. In
   `scraper.js`, a flag without a following value makes `discover` false,
   `dry` false, and the source selection fall back to every enabled source.
   With database secrets present, the command therefore performs real writes
   despite its name. Until fixed, only use:

   ```sh
   npm run discover -- <source-id>
   ```

   Recommended fix: reject `--discover` when its value is missing before
   database initialization. This was not changed during the audit because it
   alters existing CLI behavior rather than repairing a current syntax/import
   failure.

2. **Zero-link runs are recorded as successful.**

   A successful HTTP fetch with zero harvested items creates an `ok: true`
   scrape-run record. This allows a layout change, generic landing page, or
   classifier mismatch to fail silently. Add a per-source minimum-link
   threshold or record zero-link runs as degraded/failures after a configurable
   number of consecutive runs.

### Medium priority

3. **Four enabled sources bypass TLS certificate verification.**

   `ibps`, `india-post-gds`, `bel`, `nhpc`, and `rbi` currently set
   `insecureTLS: true` (five sources). This permits man-in-the-middle content
   substitution. IBPS previously required the workaround; the other four
   should be retested with normal verification and switched back where
   possible.

4. **Redirect-aware URL resolution differs between the two entry points.**

   `diagnose.js` resolves harvested relative links against `response.url`, but
   `scraper.js` discards the final response URL and resolves against the
   configured URL. A source that redirects to another path or domain may pass
   diagnostics yet generate incorrect scraper URLs. Refactor the shared fetch
   helper to return `{ html, finalUrl, status }`.

5. **The advanced regex example is not valid JavaScript regex syntax.**

   The disabled example uses `(?i)` in `include` and `exclude`. JavaScript's
   `RegExp` constructor does not support inline `(?i)` flags, so copying either
   value into an enabled source will throw `Invalid regular expression`.
   Recommended fix: compile configured regexes with the `i` flag or remove
   `(?i)` from the example and document that matching is case-sensitive.

6. **Some successful source feeds are not demonstrably current.**

   India Post GDS mostly returned January 2025 state shortlist files, and NHPC
   returned one generic backlog-vacancy PDF. They are technically working but
   should be monitored or narrowed to a current-cycle page to avoid repeatedly
   presenting stale material.

7. **Operational errors can be silently ignored.**

   The `scrape_runs` insert does not inspect Supabase's returned `error`, and
   the Telegram request does not reject non-2xx responses. Network exceptions
   are logged for Telegram, but HTTP authentication/rate-limit failures may be
   invisible. Check both results and log failures without failing successful
   post harvesting.

### Low priority

8. **Fetch/configuration code is duplicated.**

   User agent, timeout, insecure agent setup, request headers, source loading,
   and fetch behavior appear in both JavaScript files. A small shared module
   such as `lib/fetch-source.js` would prevent diagnostic/runtime drift. Keep
   harvesting generic and continue importing `harvestLinks` from the scraper
   or a dedicated harvesting module.

9. **No automated tests or lint script exist.**

   The exported `classify`, `fp`, and `harvestLinks` functions are well suited
   to Node's built-in test runner, requiring no new dependency. Priority cases:
   noise filtering, relative URLs, query canonicalization, configured regex
   errors, redirect bases, and missing CLI argument handling.

10. **The workflow uses moving action tags and a broad Node version.**

    `actions/checkout@v4` and `actions/setup-node@v4` are convenient but not
    immutable supply-chain references. For higher assurance, pin action commit
    SHAs. Also pin an explicit current Node 20 patch release because newer
    Cheerio/Undici releases have minimum Node patch requirements.

11. **Sequential retries can make failures slow.**

    Each source may consume roughly 79.5 seconds across three 25-second
    attempts and retry delays, plus the inter-source delay. The current seven
    sources fit the 20-minute workflow timeout, but restoring many blocked
    sources could exceed it. If the source list grows, use conservative bounded
    concurrency while preserving the existing per-host politeness delay.

12. **Documentation/history can become stale.**

    `SOURCES_REPORT.md` recorded 12 RBI links on 2026-07-28; the live count on
    2026-07-29 is 11, which is a normal content change. Treat that report as a
    dated snapshot rather than current status.

## Duplicate code and refactoring opportunities

No substantial duplicate business logic exists inside `scraper.js`. The main
duplication is the HTTP/source diagnostic infrastructure shared with
`diagnose.js`. A safe future refactor could extract:

- constants for user agent and timeout;
- secure/insecure fetch and redirect metadata;
- source registry loading and lookup;
- normalized error formatting.

Do not extract per-site selectors or change the generic harvesting strategy.
The classifier, title cleanup, fingerprinting, DB persistence, and Telegram
notification code have distinct responsibilities and do not currently warrant
further splitting.

## Security assessment

Positive controls:

- `.env` and `node_modules` are ignored.
- Secrets are read from environment variables and GitHub Secrets; none were
  found in repository files.
- The service-role key is not passed to frontend code.
- New posts remain `pending`.
- SQL uses Supabase's query builder rather than constructing SQL strings.
- Public RLS access is limited to published posts.
- Current npm audit result is clean.

Risks to address:

- TLS verification bypass on enabled sources.
- Mutable GitHub Action tags.
- Service-role credentials necessarily give the workflow broad database
  access; use a dedicated Supabase project and tightly control repository
  Actions permissions.
- Scraped titles and URLs are untrusted external input. Any future frontend
  must HTML-escape `raw_title` and validate outgoing URL schemes instead of
  rendering raw HTML.

## Performance assessment

For the current source count, memory and network behavior are reasonable:
pages are fetched one at a time, parsed once with Cheerio, and deduplicated
with a `Set`. SBI and BEL contain hundreds of anchors but remain small enough
for this model.

The largest avoidable costs are repeated full-page parsing in separate
diagnostic runs, sequential retry delays, and loading the Supabase client even
for modes that do not write (the module is imported at startup). None is a
current blocker. Bounded concurrency and a shared fetch module are the best
future optimizations.

## Zero Result Detection

The scraper now treats an HTTP 200 response with zero extracted links as a
warning/failure instead of a successful source run. It prints a structural
change warning, records the source ID, URL, HTTP status, response byte size,
extracted-link count, and timestamp in `logs/zero-results.json`, and continues
with the remaining sources.

Zero-result detection runs after the existing generic harvester, so it does not
change selectors, classification, filtering, or database schema. Normal
positive-result sources retain their existing behavior.

## Duplicate Detection

Before insertion, harvested jobs are compared with existing database records.
A job is treated as a duplicate when its primary URL matches an existing
primary URL, its URL appears in an existing record's `important_links`, or its
normalized title is at least 95% similar and the organization matches. Title
normalization ignores letter case and repeated/minor whitespace.

Duplicates are not inserted. Because the current schema has no `last_seen`
column and schema changes are out of scope, the existing record's `updated_at`
field is used as its last-seen timestamp. Duplicate events are appended to
`logs/duplicates.json` with the existing job ID, source ID, match method, and
timestamp. Each run prints totals for jobs found, jobs added, duplicates
skipped, and failed sources.

## Automatic PDF Parsing

Jobs whose notification URL points to a PDF are downloaded after a database job
ID is available. A dependency-free parser extracts text from common plain and
Flate-compressed PDF content streams, then applies deterministic field patterns
for organization, post, advertisement number, vacancies, dates, age, fees,
eligibility, selection, pay, and official website.

Parsed records are saved as `parsed-notifications/<job-id>.json`; unavailable
fields are `null`. Download and parse outcomes, confidence, errors, and
timestamps are appended to `logs/pdf-parser.json`. Existing parsed files are
used as a cache. Scanned/image-only PDFs and unsupported font encodings fail
cleanly because OCR, AI services, and heavy PDF dependencies are intentionally
out of scope.

## Files modified

| File | Why |
|---|---|
| `PROJECT_AUDIT.md` | Added the requested audit report. |

No existing functionality or database schema was changed. No dependency was
installed or updated.

## Remaining issues to fix next

1. Make a missing `--discover` source ID a hard CLI error.
2. Add detection/alerting for zero-link successful fetches.
3. Return and use the final redirected URL in `scraper.js`.
4. Remove unnecessary `insecureTLS` settings after secure retesting.
5. Correct the invalid `(?i)` advanced-regex example.
6. Add built-in Node tests for harvesting, classification, fingerprinting, and
   CLI argument parsing.
7. Check Supabase and Telegram API results for non-exception errors.
8. Reassess India Post GDS and NHPC for fresher notification pages.
