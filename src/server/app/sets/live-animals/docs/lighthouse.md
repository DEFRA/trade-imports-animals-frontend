# Lighthouse

Lighthouse CI checks a fixed set of frontend URLs. The source of truth is
`lighthouserc.cjs`.

## What the run does

`npm run lighthouse` runs `lhci autorun`.

The config:

- collects 19 literal URLs on `http://localhost:3000`
- runs each URL once
- uses the desktop preset
- starts Chromium with `--no-sandbox` and `--disable-gpu`
- runs `tests/lighthouse/auth-setup.cjs` before each audit
- writes HTML and JSON output to `lighthouse-report/`

The auth script opens the requested URL. If it finds the Defra ID stub form, it
signs in with user `2100010101`. It reads the password from `AUTH_PASSWORD` and
uses the stub password when that variable is absent.

The current config does not read `LH_BASE_URL`. Change the URL entries in
`lighthouserc.cjs` when the target host or route set changes.

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

Review the `collect.url` list when a route changes.

For a page that should be audited:

1. Add a stable URL to the list.
2. Make sure the workspace stack can serve it.
3. Make sure the auth script can reach the page after sign-in.
4. Run Lighthouse and open that page's HTML report.
5. Check all three asserted categories.

The list contains literal paths. Journey routes include a notification ID, so
they need a reliable way to create or seed that ID before they can replace a
literal audit URL.

Do not lower a score to make a change pass without agreement. Record why a URL
is removed. A removed URL no longer has a Lighthouse check.

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

It checks out the workspace, starts the stack for the chosen branch, installs
this frontend and runs `npm run lighthouse`. It always tears the stack down.
The workflow uploads the report for 14 days, publishes it to GitHub Pages and
passes the result, report URL and flagged findings to the workspace status
action.

When a Lighthouse change fails in CI, use the uploaded report for that branch.
Reproduce it against the same route and stack before changing code or limits.
