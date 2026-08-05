# Testing the platform

Run commands from the repository root.

## Unit and contract tests

`npm test` builds the frontend and runs the complete Vitest suite with coverage.
Platform tests live beside the L1 and L2 modules they exercise.

Important composition and convention checks include:

- [`src/server/app/routes.test.js`](../routes.test.js)
- [`src/server/app/contract.test.js`](../contract.test.js)
- [`src/server/app/copy-convention.test.js`](../copy-convention.test.js)
- [`src/server/app/copy-parity.test.js`](../copy-parity.test.js)
- [`src/server/app/indexed.test.js`](../indexed.test.js)
- [`src/server/app/store-ops.test.js`](../store-ops.test.js)

Tests may compose a real set with platform code. Production imports remain subject
to the layer rules.

## Architecture and formatting

`npm run lint` runs JavaScript, stylesheet and architecture linting. Dependency
Cruiser scans `src/server/app` and enforces the L1–L4 rules in
[`.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs).

`npm run format` writes Prettier formatting. `npm run format:check` verifies it.

## Browser-test projects

Playwright has two projects in
[`playwright.config.js`](../../../../playwright.config.js):

- `journeys` runs repository-level journeys from `e2e/`
- `features` runs co-located journey feature specs

The platform index does not define set-specific test cases. See the
[live-animals testing guide](../sets/live-animals/docs/testing.md) for fixtures,
feature specs and accessibility expectations.

## Cross-repository coverage

Contracts that cross frontend and backend repositories are described in
[Cross-repository test ownership](test-ownership.md).
