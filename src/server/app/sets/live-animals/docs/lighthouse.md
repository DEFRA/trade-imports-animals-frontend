# Lighthouse

Lighthouse CI audits the set's own pages. The URLs are derived from the set's
GET routes, so the audit follows the routes. The config is `lighthouserc.cjs`
and the target derivation is `scripts/lighthouse/audit-targets.js`.

## What the run does

`npm run lighthouse` is `run-s lighthouse:targets lighthouse:run`.

`lighthouse:targets` signs in, seeds the notifications the journey routes need,
derives the audit URLs from the set's GET routes and writes them to
`.lighthouse/targets.json`. `lighthouse:run` runs `lhci autorun` over those
URLs.

The config:

- collects the URLs from `.lighthouse/targets.json` on `http://localhost:3000`
- runs each URL once
- uses the desktop preset
- starts Chromium with `--no-sandbox` and `--disable-gpu`
- runs `tests/lighthouse/auth-setup.cjs` before each audit
- writes HTML and JSON output to `lighthouse-report/`

The auth script opens the requested URL. If it finds the Defra ID stub form, it
signs in with user `2100010101`. It reads the password from `AUTH_PASSWORD` and
uses the stub password when that variable is absent.

The current config does not read `LH_BASE_URL`.

## Passing scores

The run fails below these category scores:

| Category       | Minimum |
| -------------- | ------- |
| Performance    | 0.60    |
| Accessibility  | 0.70    |
| Best practices | 0.70    |

There is no SEO assertion.

Treat the limits as a floor, not a target. A score above the floor can still
contain a simple finding that should be fixed.

## Add or change a page

A new page needs only its route. The audit picks up every GET route of the set.

For a page that should be audited:

1. Register the route.
2. Make sure the workspace stack can serve it.
3. Make sure the auth script can reach the page after sign-in.
4. Run Lighthouse and open that page's HTML report.
5. Check all three asserted categories.

A route that is not a page goes in `SKIPPED` in
`scripts/lighthouse/audit-targets.js` with a reason. Journey routes include a
notification id, which `lighthouse:targets` seeds.

Do not lower a score to make a change pass without agreement. Record why a
route is in `SKIPPED`. A skipped route has no Lighthouse check.

## Read the output

The configured filename uses the requested path:

```text
lighthouse-report/<path>.report.<extension>
```

The CI workflow also builds `lighthouse-report/index.html` from representative
runs. It shows the performance, accessibility and best-practices score for
each page.

`scripts/lighthouse/flag-simple-findings.cjs` reads the manifest and the
representative JSON reports. It records weighted numeric or binary audits with
a score below 1 for the three asserted categories. The output is:

```text
lighthouse-report/flagged-audits.json
```

SEO findings are not included in that file.

## CI ownership

`.github/workflows/lighthouse.yml` runs after a successful branch image
publish, or by manual dispatch.

Two runners each check out the workspace, start the stack for the chosen
branch, install this frontend and run `npm run lighthouse` over their own shard
of the URLs. `LIGHTHOUSE_SHARD_INDEX` and `LIGHTHOUSE_SHARD_TOTAL` make
`lighthouse:targets` seed as usual but write only that shard's URLs: contiguous
slices that together hold every URL once. Unset, they default to one shard of
one, so a local run audits every URL. Two Chromes never share a runner, because
that would skew the performance scores. The runners are discarded afterwards,
so the stack is not torn down.

A merge job then joins the shards with
`scripts/lighthouse/merge-shard-reports.js` into one `lighthouse-report/` and
one manifest, and builds the index and flagged findings from it. The workflow
uploads that report for 14 days, publishes it to GitHub Pages and passes the
result, report URL and flagged findings to the workspace status action.

When a Lighthouse change fails in CI, use the uploaded report for that branch.
Reproduce it against the same route and stack before changing code or limits.

## The derived targets

`scripts/lighthouse/audit-targets.js` derives the audited URLs from the set's
GET routes.

- Lighthouse builds its URLs outside the server, so it never enters a request's
  set context. The script registers the set's mount, which makes the set the
  sole mounted set and lets the link builders resolve the prefix the server
  serves on.
- The route table holds prefix-free route shapes. Every shape becomes a link
  under the set's mount. The dashboard's `/` shape maps to the set base itself
  rather than to `<base>/`.
- `SKIPPED` names the GET routes that are not audited, each with its reason.
  The start entry is there because it creates a draft and redirects, so it is
  not a page. Each entry is checked against the live route table.
- A report is named after the page's route, with the set's mount prefix and the
  seeded journey id dropped, so a run overwrites its predecessor's reports.
