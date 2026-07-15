# L3 — adversarial verification — a11y-nojs-pe — claim C4

**Claim under test:** "Neither side has any automated accessibility tooling or any regression
guard for the no-JS property; both no-JS stories are true but unenforced. A's coverage is one
no-JS E2E leg covering only a single select; B has zero no-JS browser coverage but is
incidentally corroborated by ≥76 `server.inject` HTTP-level cases that cannot execute JavaScript."

**Verdict: AMENDED.** The conclusion (neither *prototype* is covered by an automated a11y check)
survives. The load-bearing supporting evidence — "axe/pa11y/Lighthouse = 0 anywhere in the repo",
asserted for *both* sides — is **flatly false**, and it is false in a way that changes the
retrofit cost and the shopping list.

---

## 1. What I verified as stated (the claim's per-side counts are accurate)

| Check | Result |
|---|---|
| A: exactly one `javaScriptEnabled: false` | ✅ `grep -rn javaScriptEnabled` over the whole A clone → **1 hit**: `prototypes/e2e/live-animals.spec.js:2893` (`test.use({ javaScriptEnabled: false })`) |
| A: that describe holds **one** test, country-of-origin only | ✅ read `live-animals.spec.js:2890-2917` — `expect(page.locator('.autocomplete__input')).toHaveCount(0)` → `selectOption` → radio "No" → submit → re-entry `toHaveValue`. Nothing else. |
| A: 2 explicit a11y assertions | ✅ `:586-587` and `:1756-1757` (`toHaveRole('combobox')` + `toHaveAccessibleName`) — the only two in the file. |
| A: `docs/limits.md:86-88` | ✅ verbatim: "Review coverage was JavaScript only … The `.njk` templates and the route wiring never got a sweep." |
| B: zero `javaScriptEnabled` | ✅ `grep -rn javaScriptEnabled` over the whole B clone → **0 hits**. |
| B: `playwright.config.js:49` single chromium project, JS on | ✅ verbatim `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]`. |
| B: `docs/testing.md` — 0 mentions of accessibility / JavaScript / progressive | ✅ grep → no hits. |
| B: ≥76 HTTP-level cases | ✅ ballpark right. They go through a local `inject(jar, …)` wrapper (`routes.test.js:94-95`), ~68 call-sites in `routes.test.js` alone, plus the commodity-lines / units / walk files. |
| B: 4 explicit a11y assertions incl. `routes.test.js:410-430` | ✅ real, and stronger than "assertion" suggests — see §3. |

So every count in the claim holds. The problem is the two words "anywhere" and "any".

---

## 2. THE COUNTER-EXAMPLE: both repos already ship a CI-wired Lighthouse accessibility gate

`grep -rni "axe|pa11y|lighthouse"` over each clone (excluding `node_modules`/`.git`) hits, **in
both**, identically:

- `lighthouserc.cjs` — **byte-identical in the two clones** (`diff` → no output), i.e. inherited
  unchanged from the shared fork point; neither side touched it. It contains:
  ```js
  assert: { assertions: {
    'categories:performance':   ['error', { minScore: 0.6 }],
    'categories:accessibility': ['error', { minScore: 0.7 }],
    'categories:best-practices':['error', { minScore: 0.7 }]
  } }
  ```
  (`lighthouserc.cjs:34-40`) — an **error-level accessibility gate**, not an advisory report.
- `.github/workflows/lighthouse.yml` — boots the workspace stack against the branch image, runs
  `npm run lighthouse` (`:83-86`), publishes the report to Pages, and **reports a check run back
  onto the PR** (`:181-187`, `report-lighthouse-status`). Triggered on `workflow_run` of "Publish
  Branch Image" for `pull_request` events.
- `package.json` → `"lighthouse": "lhci autorun"` (A `:48`, B `:27`), `@lhci/cli` in devDeps.
- `tests/lighthouse/auth-setup.cjs` (puppeteer sign-in script), `scripts/lighthouse/flag-simple-findings.cjs`.

**Why this is not a technicality.** `lighthouserc.cjs:4-24` lists 19 URLs, all on
`http://localhost:3000` and all **legacy `src/server` skeleton routes** (`/origin`,
`/commodities/identification`, `/transporters/select`…). Neither prototype's routes are in the
list. But both prototypes are mounted **into that same Hapi app, on that same port**, behind an
env flag:

- A — `src/server/router.js:69`: `if (config.get('features.prototypes.enabled')) routes.push(prototypes)`;
  E2E base path `const BASE = '/prototype-standalone/live-animals'` (`live-animals.spec.js:15`).
- B — `src/server/router.js:68`: `if (config.get('prototype.eudpa249.enabled'))` → `/prototype/eudpa-249/*`
  (playwright webServer probes `http://localhost:3000/prototype/eudpa-249/task-list`).

So the "add automated a11y checking" line item is **not** "add axe to the Playwright run" (L2
shopping list #5). It is: **add ~30 URLs to an existing `lighthouserc.cjs` and set the prototype
feature flag in the CI image.** The harness, the CI job, the PR check and the score threshold all
already exist and are already green-gating the legacy app. Both sides had this sitting in the repo
root the whole time and neither pointed it at their own prototype. That is a shared blind spot, and
it is far cheaper to close than the claim implies.

(Caveat, stated honestly: neither spike branch appears to have an open PR, and the workflow only
fires for `pull_request`-originated image builds — plus `workflow_dispatch`. So it would not have
run on either branch as things stand. That affects *whether it fired*, not *whether it exists*.)

---

## 3. Second amendment: the no-JS "guard" asymmetry is real but mis-stated, and the test-reach asymmetry is the bigger finding

- **"or any regression guard for the no-JS property"** is self-contradicting: A's single
  `javaScriptEnabled: false` test *is* a regression guard — it would go red if the country-of-origin
  select stopped submitting without JS. It is narrow (1 of 33 tests, 1 page, 1 control), and
  **neither repo runs Playwright in CI at all** (`grep -rn "test:prototype|playwright"` over both
  `.github/workflows/` → 0 hits), so it is a local-suite guard only. "No CI-enforced no-JS guard on
  either side; A has one narrow local one" is the true statement.
- **B's ≥76 inject cases are more than incidental corroboration.** They assert on the *rendered
  HTML payload*, so they double as a11y-markup regression tests — `routes.test.js:410-430` pins
  `id="commercialTransporter-hint"`, `aria-describedby="…commercialTransporter-hint"`, the
  `govuk-fieldset__legend--m` class, and the absence of `govuk-form-group--error` on first render.
- **A structurally cannot do that below E2E.** A's prototype unit harness is
  `engine/test-support.js:42-60` — `driveHandler` builds a stub `h`, calls the handler, and returns
  `{ before, after, response, view: h.captured.view }`. It captures the **view-context object**; it
  never renders Nunjucks. `grep -rln aria-describedby` over the whole A prototype tree returns
  exactly one file — `docs/validation.md`. So A's ~500-case unit suite contains **zero** markup
  assertions and cannot contain one without a new harness; every a11y/no-JS property of A's 32
  hand-written templates is verifiable only by reading, or by the JS-on E2E run. B's chosen test
  seam (server.inject → HTML string) makes an a11y assertion a one-line addition on any page.

That is the asymmetry worth carrying forward, and the original claim buries it as a parenthetical
about JS not being executable.

---

## 4. What I searched and did NOT find (the claim survives here)

- `grep -rn "noscript|no-js|nojs"` across both prototype trees → **0 hits**. No `<noscript>` fallback,
  no no-JS marker class, no server-side JS-detection anywhere on either side.
- No axe/pa11y dependency, import or Playwright fixture in either tree (the only hits are the
  Lighthouse ones in §2, all at repo root, all pre-fork).
- B has a real browser suite after all (`prototypes/journey-config-spikes/EUDPA-249-flow-layer/e2e/walk.spec.js`,
  2 specs, config `testDir` at `playwright.config.js:23`) — but JS-on, so "B has zero **no-JS** browser
  coverage" stands.
- No widget/model-level guard on either side that would fail if someone shipped a JS-only control
  tomorrow. A's `assertObligationPurity()` guards the *model* against presentational imports; it says
  nothing about a template adding a JS-dependent reveal.

## Amended claim

Neither **prototype** is covered by any automated accessibility check and neither has a CI-enforced
no-JS guard — but a11y tooling is **not** absent from the repos. Both branches inherit, unchanged
and byte-identical, a Lighthouse CI harness from the shared fork point (`lighthouserc.cjs:34-40`,
`categories:accessibility ['error', { minScore: 0.7 }]`; `.github/workflows/lighthouse.yml`, which
boots the branch image, runs `lhci autorun` and posts a check onto the PR; `@lhci/cli`,
`tests/lighthouse/auth-setup.cjs`, `scripts/lighthouse/flag-simple-findings.cjs`). Its 19-URL list
names only the legacy `src/server` routes on `localhost:3000` — and **both prototypes mount into that
same app on that same port** behind an env flag (`src/server/router.js:69` A, `:68` B), so pointing
the existing gate at either prototype is a URL-list edit plus a CI env flag, not new tooling. Neither
side made that edit. On no-JS: A has exactly one `javaScriptEnabled: false` describe — one test,
country-of-origin select only (`live-animals.spec.js:2892-2917`) — a real but narrow guard that runs
only locally (neither repo runs Playwright in CI); B has none (`playwright.config.js:49`, single
JS-on chromium project) though it does have a 2-spec JS-on browser walk. B's ≥76 `server.inject`
cases assert on rendered HTML, so they both corroborate the no-JS story and carry genuine a11y-markup
assertions (`routes.test.js:410-430`: hint `id`, `aria-describedby`, legend size, error-group);
A's ~500-case unit suite drives handlers via `engine/test-support.js:42-60`, which captures the
`h.view` **context object** and never renders Nunjucks — so A structurally cannot assert any markup or
a11y property below the E2E layer, and `grep -rln aria-describedby` over A's prototype hits only a
doc file.
