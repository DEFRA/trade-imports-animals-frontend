# L3 adversarial verification — testing-strategy, claim T3

**Claim under test:** "A has NO test of any kind on its three commodity scope-whitelists — widening a whitelist constant in one file breaks nothing in A's 526 tests."

**Verdict: AMENDED** (the directional gap is real; the central assertion, taken literally, is FALSE).

## What I searched

- `grep -rn` for all whitelist accessors and constants across the whole live-animals tree (both the three cited and the five the claim never mentions).
- `grep -rn "commoditySelection" --include="*.test.js"` across A's entire test suite, then Read every test file that seeds an out-of-whitelist commodity.
- Traced each whitelist to its consumers (`cphApplies`, `unweanedApplies`, `packageCountCommodities`, `enclosingCommodity(...)`) and then to the tests that exercise those consumers.
- Read B's `obligations/whitelists.test.js` at the cited lines.

## The cited evidence is real but proves the wrong thing

The three cited lines exist and say what the claim says:
- `features/cph-number/obligations.js:10` `includes: commodities.cphCommodities()`
- `features/commodities/obligations.js:15` `includes: commodities.packageCountCommodities()`
- `features/additional-details/obligations.js:12` `includes: commodities.unweanedCommodities()`
- exported at `services/commodities/index.js:53,65,67`, defined at `services/commodities/stub.js:30,97,99`.

And the grep is honest: **no test file anywhere in A references those symbols or the constants.** But that grep proves only that no test *names* the whitelist. It does not prove no test *exercises* it. The claim's author stopped at the symbol grep. A's tests exercise the whitelists through the behaviour they gate, with hard-coded commodity fixtures.

## Counter-examples — widening a whitelist DOES break A's tests

**PACKAGE_COUNT_COMMODITIES (engine level):**
- `item-conditional.test.js:27-33` — `reconcile({ commodityLines: [line('Cow'), line('Fish')] })`; asserts `inScope.has('commodityLines[0].numberOfPackages') === true` and `...[1]... === false`. Add `'Fish'` to the list → this fails.
- `item-conditional.test.js:35-44` — asserts the stale package count on the Fish line is *wiped*. Same mutation → fails.
- `features/commodities/consignment-details.controller.test.js:54-74` — smuggles `numberOfPackages-2: '9'` onto the Fish line and asserts `'numberOfPackages' in lines[2] === false`. Same mutation → fails.
- `...:163-183` — asserts `groups[1].showPackages === false` for Fish. Same mutation → fails.

**CPH_COMMODITIES:**
- `features/addresses/controller.test.js:36-42` — "Should not render a CPH row when no CPH-triggering commodity line exists", seed `commoditySelection: 'Cat'`, asserts `rows` length 5 and `cphRowOf(rows)` undefined. Add `'Cat'` to `CPH_COMMODITIES` → fails.
- `features/check-answers/check-answers.test.js:288-314` — `gatedOffSeed` uses `commoditySelection: 'Fish'`; "Should omit the unweaned and CPH rows when no line is an eligible commodity" asserts neither row key is present. Add `'Fish'` to `CPH_COMMODITIES` → fails.

**UNWEANED_ANIMAL_COMMODITIES:**
- The same `check-answers.test.js:310-314` assertion (`expect(keys).not.toContain('Includes unweaned animals')` for a Fish-only consignment). Add `'Fish'` to `UNWEANED_ANIMAL_COMMODITIES` → fails. `unweanedApplies` at `features/additional-details/controller.js:13-17` is the exact consumer; `check-answers/controller.js:17,136` is the caller.

**The five whitelists the claim never mentions** (A has EIGHT, not three: also `PASSPORT_`, `TATTOO_`, `EAR_TAG_`, `HORSE_NAME_`, `PERMANENT_ADDRESS_` at `stub.js:87-95`, consumed at `features/commodities/obligations.js:33,39,45,51,83`) are pinned by an exact-array assertion:
- `features/commodities/animal-identification.controller.test.js:86-96` — for a Cat line, `card.fields.map(f => f.label)` must `toEqual(['Passport number', 'Tattoo'])` exactly, and `showAddress === true`. Adding `'Cat'` to `EAR_TAG_COMMODITIES` or `HORSE_NAME_COMMODITIES` adds a label and fails this. This is a (single-value) set-equality gate on derived widgets, which the claim asserts A does not have anywhere.

So "no test of any kind" is false for all three named whitelists, and "widening a whitelist constant breaks nothing" is false for at least six distinct tests.

## What survives — the real, narrower gap

A's protection is **incidental and value-specific**; B's is **explicit and value-agnostic**.

- A has no test of whitelist *contents*. Nothing anywhere asserts membership, length, or set-equality of `CPH_COMMODITIES`/`UNWEANED_ANIMAL_COMMODITIES`/`PACKAGE_COUNT_COMMODITIES`. The tests that catch a widening only catch it if the added commodity happens to be one of the negative fixtures the suite already uses (`'Fish'`, `'Cat'`).
- Concretely: `CPH_COMMODITIES = ['Cow', '010420 - Goats']` or `= ['Cow', 'Horse']` fires **zero** direct assertions — no test seeds Goats or Horse and asserts CPH absence. Likewise `UNWEANED_ANIMAL_COMMODITIES` losing `'Horse'` (a narrowing) fires nothing — no test uses Horse for the unweaned gate. B's `whitelists.test.js:231-238` catches *any* edit of *any* value, in either direction.
- B's cited evidence checks out verbatim: `EXPECTED` map at `obligations/whitelists.test.js:177-216`, order-insensitive `expect([...codes].sort()).toEqual([...EXPECTED[name]].sort())` at `:231-238` over all 7 whitelists at `:218-229`, with the rationale written in-file at `:162-174` — including the exact insight that iterating the imported list makes a widening self-passing. (Note B has 7 whitelists and no unweaned one; A has 8.)

## Not-built vs cannot-build

This is a pure test-suite gap, not a structural one. A's whitelists are plain exported arrays; an anti-drift `EXPECTED`-map test is a ~30-line file A could adopt verbatim. Retrofit cost is trivial and the retrofit is on the shopping list. Nothing in A's model resists it.

## Amended claim

Neither side's whitelists are ungoverned, but only B governs them *deliberately*. A has no test of whitelist contents anywhere — no membership, length or set-equality assertion on any of its **eight** commodity whitelists (`stub.js:30-99`). Its whitelists are instead covered *incidentally*, by behavioural tests pinned to specific out-of-list commodity fixtures: `item-conditional.test.js:27-44` (Cow in / Fish out of `PACKAGE_COUNT`, plus the wipe), `consignment-details.controller.test.js:54-74,163-183` (no `numberOfPackages` for Fish even when smuggled in), `addresses/controller.test.js:36-42` (no CPH row for Cat), `check-answers.test.js:288-314` (no CPH or unweaned row for Fish), and `animal-identification.controller.test.js:86-96` (exact field-label array for Cat, which pins the five identifier whitelists at that one value). So "widening a whitelist breaks nothing" is false — widening with `'Fish'` or `'Cat'` kills several tests. The true hole is that the coverage is **value-keyed, not set-keyed**: widening `CPH_COMMODITIES` with any commodity the suite does not already use as a negative fixture (e.g. Goats, Horse), or narrowing `UNWEANED_ANIMAL_COMMODITIES` by removing `'Horse'`, fires zero assertions. B's two-key gate (`whitelists.test.js:177-216` `EXPECTED` map + `:231-238` order-insensitive set-equality across all 7 lists, rationale at `:162-174`) catches *any* single-file edit in *either* direction, for *any* value — a strictly stronger and deliberately mutation-derived invariant. The asymmetry is real but it is a ~30-line test file A is free to adopt, not a model limitation.
