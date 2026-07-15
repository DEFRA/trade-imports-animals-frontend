# L3 — Adversarial verification — i18n-copy — CLAIM C6

**CLAIM:** The dominant cost of retrofitting i18n into A is NOT extracting the ~428 inline
English literals (mechanical) — it is the 711 tests that pin the exact English strings
(95 unit + 616 E2E). Every `getByRole({ name: 'Save and continue' })` is locale-locked.
Extraction is the cheap half; test rewrite is the real bill.

**VERDICT: REFUTED.**

The counts are real. The inference drawn from them is wrong, and it is wrong in the exact
way this exercise was set up to catch: it prices a cost that the target state does not
actually incur, and it displaces the two costs that are genuinely hard.

---

## 1. The cited evidence — verified, with one path error

`t2-hub-copy.test.js` is at the live-animals **root**, not `features/hub/` as the claim
states (`find … -name "*hub*"`). Trivial, but the citation is wrong.

Lines 59-66 are real and say what the claim says (`t2-hub-copy.test.js:57-67`):

```js
it('Should render the six numbered groups in the design order', async () => {
  const { groups } = await renderHub()
  expect(groups.map((group) => group.caption)).toEqual([
    '1. About the consignment',
    '2. Commodity details',
    …
```

`prototypes/e2e/live-animals.spec.js` exists (127 KB); `grep -c "Save and continue"` → **87**
inline occurrences; 773 `getBy*`/`toHaveText`/`toContainText` sites. The order of magnitude
behind "711" is sound.

**But read what line 59 actually asserts.** It asserts `context.groups[].caption` — the
**resolved view-model value**, not a source literal. That distinction is the whole claim.

---

## 2. REFUTATION 1 — extraction is output-preserving, so the 711 tests cost ZERO

Externalising `'1. About the consignment'` from `features/hub/controller.js` into
`en.json` and resolving it via `t('hub.groups.consignment')` renders the **byte-identical
string**. Every one of the 711 assertions runs against rendered output — view context
(unit: `expect(context.heading).toBe('Overview')`, `t2-hub-copy.test.js:47`) or the DOM
(E2E: Playwright). None of them reads source.

So after a faithful extraction, **all 711 tests pass unmodified**. They are not a bill.
They are a free, extremely valuable **lossless-refactor regression harness** — precisely
what you want when a build loop is mechanically moving 428 strings out of 54 files. The
claim has the sign backwards: on the work it scopes, the test suite is an **asset**, not a
liability.

The 711 tests only become a cost if the **rendered English changes**. Changing the English
is a content-design project, not an i18n retrofit.

## 3. REFUTATION 2 — B built the i18n layer and did NOT delocalise its tests

This is the killer, and it is available on the other side of the comparison.

If "having i18n" required rewriting English-pinning tests, B's suite — B has `lib/i18n.js`,
`locales/en.json` (362 keys), a coverage gate and zero-copy templates — would be
delocalised. It is not:

- `e2e/journey.js:48` — `await page.getByRole('button', { name: 'Save and continue' }).click()`
- `routes.test.js:208` — `expect(res.payload).toContain('Save and continue')`
- `routes.test.js:204` — `toContain('There is a problem')`; `:267` `toContain('Choose the means of transport')`
- `contract.test.js:145`, `e2e-units.test.js:143/244/445`, `e2e-walk.test.js:366-384`,
  `e2e-commodity-lines.test.js:420-718` …

Regex sweep for English-pinning assertion sites across B: **80 sites**
(`state/scratch/b-english-pins.txt`). The claim names
`getByRole({ name: 'Save and continue' })` as *the* archetype of locale-locking — **B
contains that exact line.**

And B's behavioural specs do not resolve through the catalogue: only **2 of B's test files**
import `lib/i18n.js` (`i18n-coverage.test.js`, `domain/index.test.js`) and both are
*catalogue* gates (does the key exist?), not behavioural specs.

**Conclusion:** the reference implementation of the target state pays no test-rewrite bill.
The claim mistakes the cost of **running the suite in a second locale** — which *neither*
side has done, which is not part of an i18n retrofit, and which is therefore not a
differential cost of A at all — for a cost of the retrofit itself. This is the
"not-built ≠ cannot-be-built" failure mode, applied to a cost rather than a capability.

## 4. REFUTATION 3 — even the second-locale case is not 711 rewrites

Suppose you *do* want to run the suite in Welsh. The claim implies 711 hand-edits. It is a
codemod:

- A's 484 `name: '…'` selector sites collapse to **122 distinct strings**
  (`state/scratch/a-names-{raw,uniq}.txt`) — a 4:1 collapse. Work scales with the distinct
  set, not the site count.
- The substitution map (English → key) **is the `en.json` the extraction just produced**.
  Delocalising the tests is *derived from* the extraction artifact — the same mechanical
  character the claim reserves exclusively for the extraction half. Both halves are
  mechanical, and one generates the other's input.
- The pattern already exists in A: `prototypes/e2e/journey.js:239`
  `export const SAVE = 'Save and continue'` (a shared constant), and
  `live-animals.spec.js:3-4` already imports `COUNTRY_LABELS` and `PORTS` **from the app's
  own service stubs** rather than hardcoding country/port names — i.e. parts of A's E2E
  already derive display strings from the same source the app reads.

## 5. What the claim DISPLACES — the costs that are actually dominant

By elevating a codemod, the claim demotes the two items that are genuinely not mechanical
(both already identified in `L2-i18n-copy.md`, so the claim contradicts its own parent):

1. **A has no copy declaration sites.** L2 §3 concedes B's coverage gate *"does not land —
   A has no declaration sites to walk"*. A's copy is *authored* across 32 `.njk` + 22
   controllers; B's is *declared* (`titleKey`, `OBLIGATION_KEYS`, domain `labels`). You must
   first **build A a presentation/title registry** (~27 pages) before any gate can exist.
   That is new structure, i.e. design work — and it sits on the *extraction* side, which the
   claim calls "the cheap half".
2. **Code-vs-label decoupling with a byte-exact wire contract.** `meansOfTransport` /
   `transporterType` / `commoditySelection` persist their **English display label**;
   `services/persistence/records/notification-mapper.js:451` passes it straight through and
   `skeleton-equivalence.test.js` pins the payload byte-exact against the legacy service.
   15 conditional obligations gate on those labels and all carry `wipeOnExit: true`. Touching
   them has a **persistence blast radius**. This is the expensive item, and B — having no
   persistence layer — offers no answer to it.
3. **Parameterised copy.** `` `Enter details for ${species} ${records + 1} of ${cap}` ``
   needs a params/state channel that *neither* catalogue model has (B escaped into English
   template literals in `check-your-answers/controller.js:139-151` when it hit this).

## 6. The residual grain of truth (bounded, and not what the claim says)

One real, small test cost exists: where extraction **unifies duplicates that differ subtly**
— the V4 address block is re-typed across 3 templates/3 controllers (~75 sites) — collapsing
them to one key changes rendered output wherever the copies diverged, breaking those specific
assertions. That is bounded, it is a *benefit being surfaced by the tests*, and it is nothing
like "711 tests are the real bill".

---

## What I searched

- Read `L2-i18n-copy.md`, `L1-i18n-copy-A.md` (state dir).
- `find … -name "*hub*"` → cited path is wrong (root, not `features/hub/`).
- Read `t2-hub-copy.test.js` in full (221 LOC) — confirmed assertions target the **resolved
  view context**, not source.
- `grep -c "Save and continue"` in A's `live-animals.spec.js` → 87; `getBy*`/`toHaveText`
  sweep → 773 sites. Counts broadly sound.
- **Counter-example hunt:** `grep -rln "Save and continue"` across B → hits in
  `routes.test.js` and `e2e/journey.js`. Regex sweep of B's English-pinning assertions → 80
  sites. `grep -rln "from './lib/i18n.js'"` across B → only 2 test files, both catalogue
  gates.
- Distinct-vs-total selector literals in A → 484 raw / 122 unique.
- Confirmed `journey.js:239` `export const SAVE` and `live-animals.spec.js:3-4` stub imports.

Scratch: `state/scratch/{b-english-pins,a-e2e-sites,a-names-raw,a-names-uniq,a-spec-top}.txt`
