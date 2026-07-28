# Source verification report

Verified on 2026-07-28. `links found` is the number of links accepted by the
same generic harvesting and classification logic used by `scraper.js`. For
disabled sources it records the diagnostic run before disabling.

| source_id | bucket (A-F) | final URL | links found | action taken | notes |
|---|---|---|---:|---|---|
| ssc | D | https://ssc.gov.in/ | 0 | Disabled with `_note` | HTTP 200. DIAGNOSIS: SPA / JavaScript-rendered page; static HTML has no usable links. Five plausible API paths returned `text/html` SPA shells, not JSON. |
| upsc | E | https://upsc.gov.in/whats-new | 0 | Enabled insecure TLS, retried, then disabled | HTTP unavailable. DIAGNOSIS: connection timeout; retry with insecure TLS also timed out. |
| ibps | A | https://www.ibps.in/ | 10 | Set `insecureTLS: true` | HTTP 200. DIAGNOSIS: Static HTML works; 10 usable links. Discover returned relevant recruitment/results. |
| rrb-apply | C | https://www.rrbapply.gov.in/ | 0 | Disabled with `_note` | HTTP 404. DIAGNOSIS: HTTP 404; investigate the URL or blocking. |
| upsssc | E | https://upsssc.gov.in/AllNotifications.aspx | 0 | Retried with insecure TLS, then disabled | HTTP unavailable. DIAGNOSIS: connection timeout with insecure TLS enabled. |
| uppsc | C | https://uppsc.up.nic.in/FileNotFound.aspx?aspxerrorpath=/Notifications.aspx | 0 | Tested likely paths, then disabled | HTTP 200 after redirect to an error page. DIAGNOSIS: no links passed filters; `/Notifications.aspx`, candidate/outer variants, `/Advertisement.aspx`, and `/` returned HTTP 404 in direct checks. |
| bpsc | E | https://www.bpsc.bihar.gov.in/ | 0 | Disabled with `_note` | HTTP unavailable. DIAGNOSIS: DNS `ENOTFOUND`. |
| rpsc | E | https://rpsc.rajasthan.gov.in/ | 0 | Retried with insecure TLS, then disabled | HTTP unavailable. DIAGNOSIS: connection timeout with insecure TLS enabled. |
| mppsc | E | https://mppsc.mp.gov.in/ | 0 | Retried with insecure TLS, then disabled | HTTP unavailable. DIAGNOSIS: connection timeout with insecure TLS enabled. |
| join-indian-army | E | https://joinindianarmy.nic.in/ | 0 | Retried with insecure TLS, then disabled | HTTP unavailable. DIAGNOSIS: connection timeout with insecure TLS enabled. |
| indian-navy | E | https://www.joinindiannavy.gov.in/ | 0 | Retried with insecure TLS, then disabled | HTTP unavailable. DIAGNOSIS: connection timeout with insecure TLS enabled. |
| afcat | E | https://afcat.cdac.in/ | 0 | Retried with insecure TLS, then disabled | HTTP unavailable. DIAGNOSIS: connection timeout with insecure TLS enabled. |
| sbi-careers | B | https://sbi.bank.in/web/careers/current-openings | 53 | Replaced redirected domain and generic careers landing page with current openings | HTTP 200. DIAGNOSIS: Static HTML works; 53 usable links. Discover returned current applications, advertisements, and call letters. |
| rbi | A | https://opportunities.rbi.org.in/Scripts/Vacancies.aspx | 12 | No change | HTTP 200. DIAGNOSIS: Static HTML works; 12 usable links. Discover returned relevant vacancies. |
| nta | C | https://www.nta.ac.in/ | 0 | Disabled with `_note` | HTTP 200. DIAGNOSIS: page loaded but no links passed filters. The reachable archive yielded 17 predominantly stale 2019-2021 items, not a reliable current feed. |
| isro | A | https://www.isro.gov.in/Careers.html | 4 | Added verified source | HTTP 200. DIAGNOSIS: Static HTML works; 4 usable links. Discover returned current recruitment notices. |
| india-post-gds | A | https://indiapostgdsonline.gov.in/Home.aspx | 25 | Added verified source | HTTP 200. DIAGNOSIS: Static HTML works; 25 usable links. Discover returned the notification and state-wise shortlisted-candidate results. |
| bel | A | https://bel-india.in/job-notifications/ | 9 | Added verified source | HTTP 200. DIAGNOSIS: Static HTML works; 9 usable links. Discover returned current advertisements/application links. |
| nhpc | A | https://www.nhpcindia.com/welcome/job | 1 | Added verified source | HTTP 200. DIAGNOSIS: Static HTML works; 1 usable link. Discover returned a relevant vacancy PDF. |

## SPAs needing manual DevTools work

- `ssc` — the static response is an application shell with no anchors.
  `/api/notifications`, `/api/v1/notices`, `/api/notice-board`,
  `/Home/GetNotifications`, and `/api/latest` all returned HTTP 200
  `text/html`, not JSON.

## JSON API endpoints discovered

- None.

## Requested additions not enabled

The remaining suggested SSC regional, RRB regional, state-board, court, and
PSU sources were not added because a working notification page was not
verified in this pass. In particular, DRDO `/drdo/careers` returned HTTP 404
and Coal India `/career-cil/jobs-coal-india/` returned HTTP 403. Unverified
URLs are intentionally absent rather than enabled speculatively.
