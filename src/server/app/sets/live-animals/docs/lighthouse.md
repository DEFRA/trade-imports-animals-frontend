# Lighthouse

Lighthouse CI audits the set's own pages. The URLs are derived from the set's
GET routes, so the audit follows the routes. The config is `lighthouserc.cjs`
and the target derivation is `scripts/lighthouse/audit-targets.js`.

## How to run it

Start the workspace stack, then run `npm run lighthouse`. Never run
`lhci autorun` on its own: it fails without the targets file the first step
writes, and it skips the run step that clears old reports and gives each report
its route-derived name.

`npm run lighthouse` is `run-s lighthouse:targets lighthouse:run`.

`lighthouse:targets` (`scripts/lighthouse/seed-audit-targets.js`):

- makes sure the address book holds an address, at
  `TRADE_IMPORTS_ADDRESS_BOOK_URL` (default `http://localhost:8089`)
- signs in
- seeds one notification per seed shape: draft, submitted and transit
- derives one URL per audited GET route
- re-fetches every URL in this run's shard (every URL when unsharded) in a
  fresh signed-in session and fails the run unless each answers 200 with a
  heading
- writes the origin, journey ids, URLs and report names to
  `.lighthouse/targets.json`

`lighthouse:run` (`scripts/lighthouse/run-audit.js`) clears the previous run's
reports, runs `lhci autorun` over the URLs, then renames each report to its
route-derived name. With no URLs it runs nothing and writes an empty manifest.

The origin is `LIGHTHOUSE_BASE_URL`, default `http://localhost:3000`.

The config:

- collects the URLs from `.lighthouse/targets.json`
- runs each URL once
- uses the desktop preset
- starts Chromium with `--no-sandbox`, `--disable-gpu` and
  `--disable-dev-shm-usage`
- runs `tests/lighthouse/auth-setup.cjs` before each audit
- writes HTML and JSON output to `lighthouse-report/`

The auth script opens the requested URL. If it finds the Defra ID stub form, it
signs in with user `2100010101`. It reads the password from `AUTH_PASSWORD` and
uses the stub password when that variable is absent.

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
2. If the page renders only on a submitted notification, or only on a draft
   whose reason for import is transit, add its route to `FILLED_BY` with
   `submitted` or `transit`. Any other journey route is
   audited on the draft.
3. If the page needs a query string before it renders rather than redirects,
   add its route to `QUERY`.
4. Make sure the workspace stack can serve it.
5. Make sure the auth script can reach the page after sign-in.
6. Run `npm run lighthouse`. The render check fails the run when the page does
   not answer 200 with a heading.
7. Open that page's HTML report and check all three asserted categories.

A route that is not a page goes in `SKIPPED` in
`scripts/lighthouse/audit-targets.js` with a reason.

Do not lower a score to make a change pass without agreement. Record why a
route is in `SKIPPED`. A skipped route has no Lighthouse check.

## Read the output

Each report is named after its page's route, with the set's mount prefix and
the seeded journey ids dropped, and `home` for the root:

```text
lighthouse-report/<route-derived name>.report.<extension>
```

Two routes that would share a name fail the run.

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

## How pages are picked

`scripts/lighthouse/audit-targets.js` derives the audited URLs from the set's
GET routes.

- Lighthouse builds its URLs outside the server, so it never enters a request's
  set context. The script registers the set's mount, which makes the set the
  sole mounted set and lets the link builders resolve the prefix the server
  serves on.
- Every GET route is audited except those in `SKIPPED`.
- `FILLED_BY` names the seeded shape (draft, submitted or transit) a route is
  audited on. A route not listed is audited on the draft.
- `QUERY` adds a query string to a route that needs one.
- The route table holds prefix-free route shapes. Every shape becomes a link
  under the set's mount. The dashboard's `/` shape maps to the set base itself
  rather than to `<base>/`.
- `SKIPPED` names the GET routes that are not audited, each with its reason.
  The start entry is there because it creates a draft and redirects, so it is
  not a page.
- A route with a path parameter other than the journey id must be in `SKIPPED`,
  or derivation fails.
- Every entry in `SKIPPED`, `FILLED_BY` and `QUERY` is checked against the live
  route table.
