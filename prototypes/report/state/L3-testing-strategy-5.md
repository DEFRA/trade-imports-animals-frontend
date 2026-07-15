# L3 — Adversarial verification: T5 (testing-strategy)

**Claim under test:** Neither side measures coverage and neither side snapshots UI — both lazy
narratives are dead. Both vitest configs instrument only `src/**/*.js`, leaving `prototypes/`
outside the instrument, no thresholds; 1,021 test cases produce zero measured lines. A additionally
runs its suite with `--no-coverage`. Zero `toMatchSnapshot` on either clone.

**Verdict: AMENDED.** The central thesis survives and is in fact *stronger* than stated. Three of the
four supporting details are materially imprecise, and two of the parenthetical "the docs oversell"
rebuttals are themselves misreadings.

---

## 1. What I verified against source

### Coverage config — CONFIRMED, verbatim

`clone-live-animals/vitest.config.js` — read in full. `coverage: { provider: 'v8', reporter:
['text','lcov'], include: ['src/**/*.js'], exclude: [...] }`. **No `thresholds` key.**
`clone-flow-layer/vitest.config.js` — byte-for-byte the same coverage block (only the `test.exclude`
comment/paths differ). **No `thresholds` key.**

`find … -name "vitest*" -not -path "*/node_modules/*"` returns **exactly one config per clone**, both
at repo root. There is no per-prototype vitest config, no `vitest.workspace.*`, no `.nycrc`, no
second `include`. So the `include: ['src/**/*.js']` is the only instrument on either side, and
`prototypes/` is outside it. **Confirmed on both.**

### The coverage blindness is DOUBLED — a fact the claim misses (strengthens it)

Both clones' `sonar-project.properties` set `sonar.sources=src/`, `sonar.tests=src/`,
`sonar.javascript.lcov.reportPaths=./coverage/lcov.info`
(`clone-live-animals/sonar-project.properties:15-20`, `clone-flow-layer/…:15-20`). CI on both runs
`npm test` then `SonarSource/sonarqube-scan-action` (`check-pull-request.yml:33-45`). SonarCloud's
quality gate is the **only real coverage threshold anywhere in either pipeline** — and its `sources`
scope also excludes `prototypes/`. So the prototypes are invisible to *two independent* coverage
instruments, not one. Nobody could have noticed the gap from a CI red.

### Snapshots — CONFIRMED, and more strongly than claimed

The L2/claim grep was `toMatchSnapshot|toMatchInlineSnapshot|__snapshots__` over `prototypes/`. That
grep is too narrow — it misses Playwright's visual/aria snapshotting, which is exactly where A's 33
browser tests could have hidden one. I widened it:

```
grep -rni "toMatchSnapshot\|toMatchInlineSnapshot\|__snapshots__\|toMatchFileSnapshot\
\|toHaveScreenshot\|toMatchAriaSnapshot" <both clones> --exclude-dir=node_modules
```

→ **one hit, and it is a code comment**: `prototypes/e2e/skeleton-vs-prototype-mongo.spec.js:383`
`// Snapshot existing refs so the prototype's (URL-less) referenceNumber can …`.

`find … -name "*.snap" -o -name "*-snapshots" -o -name "__snapshots__"` → **empty on both**.

So: zero snapshot assertions of *any* kind, across the *whole* of both clones (not just
`prototypes/`), including Playwright `toHaveScreenshot`/`toMatchAriaSnapshot`. The claim understates
its own case.

`dump.test.js` (B) verified: it does call itself "snapshot tests" (`:1-5`) and it is not one. But the
claim's "3 hand-written field assertions" undersells it — it is **3 `it` cases carrying ~20
assertions** over `report()`'s logical-model output (`:13-30`, `:37-48`, `:55-67`). Not a snapshot;
not 3 assertions either.

---

## 2. Where the claim does NOT survive contact with the source

### 2a. `--no-coverage` is INERT. Presenting it as an aggravating factor is wrong.

`package.json:45` `"test:live-animals": "TZ=UTC vitest run prototypes/standalone/live-animals
--no-coverage"` — the quote is real. But:

- A's **root `npm test`** is `TZ=UTC vitest run --coverage --exclude ./tests/**` (`package.json:37`).
  The config's `test.exclude` only removes `prototypes/e2e/**` and `**/_quarantine/**`. So
  `prototypes/standalone/live-animals/**/*.test.js` **do run under `npm test`, with `--coverage`**,
  and that is what CI runs (`check-pull-request.yml:36`). B's is identical (`package.json:26`).
- Deleting `--no-coverage` from `test:live-animals` would change **nothing**: `include:
  ['src/**/*.js']` is what excludes the prototype, not the flag. The flag is a dev-loop speed
  switch on a targeted script.

The claim implies A is *additionally* culpable. It is not. The single cause on both sides is the
`include`.

### 2b. "Zero measured lines" is literally false for A.

`services/persistence/records/skeleton-equivalence.test.js:3-5` imports **three real `src/`
modules**:

```js
import { notificationClient } from '../../../../../../src/server/common/clients/notification-client.js'
import { getTotal }           from '../../../../../../src/server/common/helpers/object-helpers.js'
import { sessionKeys }        from '../../../../../../src/server/common/constants/session-keys.js'
```

Those files are inside `include: ['src/**/*.js']`, so under `npm test` A's prototype suite **does**
contribute measured lines — for those three src modules. B has **zero** `src/` imports from its spike
(grep returns empty), so B's "zero measured lines" is exact and A's is not. The substantive point
(none of the ~33k lines of prototype code under comparison is instrumented) is untouched.

The "1,021" figure is also approximate. My own count of `^\s*(it|test)\(` declaration sites:
**~535 in A's live-animals**, **~499 in B's flow-layer** (≈1,034). 11 of A's do not run by default
(§2c) and B's 495 sites expand to 566 runtime cases. "~1,000 test cases, none of them instrumenting a
line of the code under comparison" is the honest form.

### 2c. "11 dark integration cases" — true count, wrong word.

`grep -rn "LIVE_ANIMALS_IT"` across the whole clone returns **three hits and no more**: the
definition (`services/persistence/it-mode.js:1`) and two comment lines. So "set by no npm script, no
CI job, no config" is **factually correct**. But the framing is not:

- They are **two files, two modes**, not one: `records/real.integration.test.js:39`
  `describe.skipIf(!runsIt('real'))` (6 cases) and `session/real.redis.integration.test.js:65`
  `describe.skipIf(!runsIt('testcontainer'))` (5 cases). 6 + 5 = 11 — the count checks out.
- They are **documented opt-in gates, not forgotten code**. `real.integration.test.js:16-22` states
  the design and hands you the command: *"Runs under `LIVE_ANIMALS_IT=real` (or `=all`); the default
  (stubs/unset) skips it, so the default hermetic `npm run test:live-animals` run adds ZERO running
  tests here. Run it only against a live stack backend … `LIVE_ANIMALS_IT=real npm run
  test:live-animals -- real.integration`"*, and adds that the Mapper B case needs a **dev-mode
  extended backend image**, i.e. a cross-repo workspace stack the frontend repo's CI does not have.
  That one is *un-CI-able by construction*, not dark.
- The **fair** criticism is narrower and survives: the testcontainers Redis file needs only Docker
  (`testcontainers` is a devDependency; CI already runs `docker build`), so **5 of the 11 could run in
  CI today and nobody wired them**. "Dark" is right for those 5; for the other 6 it is wrong.

### 2d. Both "the docs oversell" parentheticals are misreadings.

- **A's `docs/testing.md:98-100`.** The claim says it "claims the E2E pins DOM 'byte-for-byte' and
  overstates". Read the sentence: *"The specs assert the rendered page — headings, roles, `govuk-*`
  classes, row text — not internal state. … a pure rename or restructure that changes no behaviour
  and no markup passes both suites **byte-for-byte unchanged**."* "Byte-for-byte" modifies **"passes
  both suites unchanged"** (a refactor-safety claim about the *suite*), not "pins the DOM". Only the
  *heading* ("Why the specs pin exact DOM") oversells; the body is precise.
- **"the specs are `getByRole`-based, so they pin the accessible DOM"** — this correction is itself
  wrong. `grep -rc "govuk-" prototypes/e2e` → `live-animals.spec.js:60`, plus hits in 7 other spec
  files. A's specs assert **`govuk-*` class structure as well as roles** — which is exactly what the
  doc's body says. So the CODE HONOURS THE DOC here; the claim credits the doc with an overstatement
  it did not make, and then "corrects" it with a description of the specs that is also inaccurate.

---

## 3. Not-built vs cannot-be-built

This is squarely **"not built"**, on both sides, and the claim says so. Adding
`'prototypes/**/*.js'` to `coverage.include` (and a `thresholds` block) is a one-line change per
repo; nothing in either model resists it. The one wrinkle worth recording: turning it on repo-wide
would instrument **all** of A's abandoned spikes (`spike-a`..`spike-d`,
`obligations-standalone-spike`, `obligations-v2-spike`) and B's frozen `model-spikes/
obligations-v4-model/` ancestor, so the include needs to name the live prototype path, not
`prototypes/**`. Cheap, but not literally one character.

Also worth recording against "neither side measures coverage": **B measures suite efficacy by other
means** — the 644-line manual mutation register (`docs/testing.md`, 16 mutations, "0 failures = a
defect in the suite"). That is not line coverage and does not rescue the line-coverage claim, but
"neither side has any measurement of whether its tests have teeth" would be false, and the claim
should not be allowed to imply it. A has no equivalent.

---

## 4. Searches run (for the record)

- `find <both> -name "vitest*" -not -path "*/node_modules/*"` → 1 config each, root only.
- Full read of both `vitest.config.js`.
- `grep -n '"test' <both>/package.json` → A:23-49, B:26-31.
- `grep -rni "coverage\|threshold" <A>/.github <A>/sonar-project.properties`; same for B.
- `cat <A>/.github/workflows/check-pull-request.yml` → CI runs bare `npm test` + Sonar scan.
- `grep -rlni "toMatchSnapshot|…|toHaveScreenshot|toMatchAriaSnapshot|snapshot" <both>/prototypes`
  then the exact-matcher grep over the **whole** clones → 1 comment hit, 0 assertions.
- `find <both> -name "*.snap" -o -name "*-snapshots" -o -name "__snapshots__"` → empty.
- `grep -rn "LIVE_ANIMALS_IT" <A>` → 3 hits (1 def, 2 comments).
- `grep -rn "runsIt\|skipIf" <A>/prototypes/standalone/live-animals` → 2 gated files.
- `grep -rn "from '.*src/" ` in both prototypes → A: 3 imports in `skeleton-equivalence.test.js`;
  B: none.
- `grep -rc "govuk-" <A>/prototypes/e2e` → 60 in `live-animals.spec.js` + 7 other files.
- `grep -rhc "^ *it(\|^ *it\.\|^ *test(" ` over both prototypes → ~535 (A) / ~499 (B).
</content>
</invoke>
