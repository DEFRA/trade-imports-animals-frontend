# Cross-repo test ownership

This repository owns tests for frontend code and local journey behaviour. The
trade-imports workspace owns deployed tests that need several services.

There is no dual-frontend parity project in the current Playwright config.

## This frontend repository owns

- Vitest unit and contract tests under `src/`
- stub and real adapter request-shape tests
- the local stub journey smoke test in `e2e/`
- feature Playwright specs under
  `src/server/app/sets/live-animals/journeys/linear/features/`
- the Playwright server and project settings in `playwright.config.js`
- Lighthouse configuration and report processing

A frontend change must prove its page, model, engine and adapter behaviour here.
See [testing.md](testing.md).

## The workspace repository owns

`../../../../../../.github/workflows/e2e-tests.yml` delegates to:

```text
DEFRA/trade-imports-animals-workspace/.github/workflows/e2e-tests.yml@main
```

That reusable workflow is the cross-repo test entry point used by this
repository. This repository passes the branch name and inherits secrets. It
then reports the reusable workflow result back to the pull request.

The workspace test should own behaviour that needs the published frontend
image and other running trade-imports services. The workspace also owns the
shared E2E report link used by this repository's status check.

## When a contract changes

Keep the quickest exact check at the boundary that defines the contract:

- a controller or view change gets a feature spec here
- a frontend-to-backend payload change gets an adapter contract test here
- the backend keeps its own request and persistence tests
- an end-to-end change across published services gets a workspace test

Do not rely on only the workspace suite for a frontend rule that Vitest or a
feature spec can prove. Do not copy a full cross-service setup into this
repository when the workspace runner already owns it.

For a change that affects both repositories:

1. Add or update the local frontend contract test.
2. Add or update the backend contract test in the backend repository.
3. Update the workspace journey when the user-visible path or service
   interaction changes.
4. Use matching branch images when the workspace workflow supports them.

The frontend pull request check remains the source for unit, format, lint and
coverage results. The delegated E2E check remains the source for the deployed
cross-repo result.

Keep both results visible on a change that crosses the boundary.
