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

Vitest gives each test file its own module registry, so a test file that
reconfigures a seam leaks to no other file. The global set-up wires the real
readiness roll-up; a suite that wants a fixed answer overrides it with its own
`configureReadyForCheckYourAnswers` call.

## The second set and the completeness gate

[`test/fixtures/second-set.js`](../../../../test/fixtures/second-set.js) is a
second obligation set that exists only for tests. Co-residency is a property of
the platform, not of one set, so proving it needs two sets mounted in one
process. The fixture is the smallest set that fills every `configure*` seam and
mounts under its own prefix. Its routes echo the configuration they resolve, so
a test can read back which set answered and with whose obligations.

[`set-completeness.test.js`](../set-completeness.test.js) proves a set that
forgets a seam does not mount. Three seams answer benignly when unconfigured:
the journey flow returns no sections and no task rows, the session returns the
shared default cookie names, and the readiness roll-up answers false forever.
The completeness gate turns each of those into a failed mount. The probe
gateways are built in that test, not in the second set, because each probe has
to be wrong in one specific way and the second set is correctly wired.

## Architecture and formatting

`npm run lint` runs JavaScript, stylesheet and architecture linting. Dependency
Cruiser scans `src/server/app` and enforces the L1–L4 rules in
[`.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs).

`npm run format` writes Prettier formatting. `npm run format:check` verifies it.

## Browser-test projects

Playwright has two projects in
[`playwright.config.js`](../../../../playwright.config.js). Both are frontend
integration tests ("fit") — the real frontend server and browser, but every
external integration (backend, auth) is stubbed, so no real deployed service
is involved:

- `journeys` runs repository-level journeys from `fit/`
- `features` runs co-located journey feature specs

The platform index does not define set-specific test cases. See the
[live-animals testing guide](../sets/live-animals/docs/testing.md) for fixtures,
feature specs and accessibility expectations.

## Cross-repository coverage

Contracts that cross frontend and backend repositories are described in
[Cross-repository test ownership](test-ownership.md).
