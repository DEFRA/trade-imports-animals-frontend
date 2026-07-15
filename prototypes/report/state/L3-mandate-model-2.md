# L3 — Adversarial verification — C2 (mandate-model)

**Claim under test:** "B structurally cannot express a conditional mandate below notification level. For every obligation `within` a group, `buildImplication` stamps the STATIC `obligation.status` onto every record and the `applyTo`-returned status is discarded… B's only per-record mandate-off is record ABSENCE, and a record leaving the allowlist purges the stored value unconditionally."

**Verdict: AMENDED.**

Every cited line is real and says what the claim says it says. But the claim's headline — "**structurally** cannot" — does not survive contact with the source, and its closing sentence ("B's only per-record mandate-off is record ABSENCE") is false. Two independent counter-examples below.

All paths relative to `clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/`.

---

## Step 1 — the cited evidence, re-read at source. All of it checks out.

| Cited | Verified | What the source actually says |
|---|---|---|
| `evaluator.js:477` (`field`) | YES | `records: parentGroupFulfilmentIds.map((fulfilmentId) => ({ fulfilmentId, status: obligation.status }))` |
| `evaluator.js:490` (`derived-leaf`) | YES | `impl.records = fulfilmentIds.map((fulfilmentId) => ({ fulfilmentId, status: obligation.status }))` |
| `evaluator.js:505` (`user-leaf`) | YES | identical |
| `own` consulted only for `.records` / `.reasons` | YES | `:462`, `:486-487`, `:498`. `own.status` is read on **no** group-scoped branch. The `field` branch (`:469-479`) ignores `own` entirely — not even `reasons`. A status returned by an `applyTo` on a `within` obligation is dropped. |
| `helpers.js:198-209` — `filterAndProject` → `records: string[]` | YES | `passingKeys` is a `string[]`. No helper in the library emits a status: `allowListed` (`:39-57`), `allowListedByPredicate` (`:65-93`), `matches` (`:147-154`) all return `{ inScope, records }` only. |
| `purgeStorage` `evaluator.js:350-366` | YES | derived-leaf storage is filtered to the `applyTo` `records` set; any record not in the set is dropped. Grep for `wipeOnExit\|retainValue\|keepValue\|preserveOnExit` across the whole spike: **zero hits** — there is no opt-out. |
| `obligations.md:242` half-false | YES | 12 group-scoped obligations carry a literal static `status:` (`obligations.js:635,645,655,665,684,697,710` + the five `commodityLine` fields). Doc says mandate is "NOT on the obligation". |

One precision the claim misses: purge-by-allowlist applies **only** to `category === 'derived-leaf'` (`evaluator.js:350`). `field` and `user-leaf` storage is kept as-is (`:367-376`). That happens to be the category where it matters (all six conditionally-scoped unit identifiers plus `permanentAddress` are derived-leaf), so the claim is right where it counts — but it is not "every record".

## Step 2 — counter-example hunt #1: is the STATUS CONTRACT static, or only the PRODUCER?

Only the producer. Every consumer in B is already per-record status-aware, and **already tested that way**:

- `engine/index.js:283-285` — the engine's own contract comment: *"Field / derived-leaf records live in `impl.records[]`, each carrying `{ fulfilmentId, status: 'mandatory' | 'optional' }`."* The schema **declares** per-record variance.
- `engine/index.js:291-297` — `effectiveStatus(obligation, path, state)` is **path-keyed**: `const record = (impl.records ?? []).find(r => r.fulfilmentId === path); return record?.status ?? 'mandatory'`.
- `engine/index.js:157`, `:191` — `firstUnfulfilledPageForLine` / `ForUnit` read `(record.status ?? 'mandatory') !== 'mandatory'` **per record**.
- `engine/index.js:393` — `classifyEntries` (the hub/task-list/journey-status classifier) calls `effectiveStatus(e.obligation, e.path, state)` per expanded entry, and `expandPresents` (`:258-270`) makes one entry per record on a `presentsForEach` page.
- `contract.js:315-322` — `isSufficientForProceed` calls `effectiveStatus(obligation, path, …)` too, so the page-save gate would stand down per record the moment record status varied.
- **Tests already assert per-record status variance**: `engine/index.test.js:852-853` (two records, both `status: 'mandatory'`), `:867-886` — a test literally named **"skips optional records"** feeding `records: [{ fulfilmentId: 'line1/unit1', status: 'optional' }]` and asserting the walker skips it. Also `:981-992`, `:1021-1156` — hand-built per-record `status: 'optional'` implications driving `classifyEntries` to OPTIONAL/FULFILLED.

And the producer already has the *data* to decide per record: `applyTo(fulfilments, fulfilmentIdsByObligationId)` receives the whole storage map keyed by path, which is exactly how `allowListedByPredicate` already makes a **per-record** decision from the parent line's commodity code (`helpers.js:65-93` → `filterAndProject`, `helpers.js:182-210`). It filters per record today; it simply projects the answer down to a `string[]` instead of a `{fulfilmentId, status}[]`.

Traced cost of wiring it (not guessed):
1. `evaluator.js:475-478 / 487-491 / 503-506` — accept a record entry as `string | {fulfilmentId, status}` and prefer the per-record status, falling back to `obligation.status`: ~6 lines in one function.
2. `evaluator.js:353-355` — `purgeStorage` builds `new Set(decision.records)`; normalise to ids or the Set holds objects and purges everything: 1 line.
3. One new helper factory beside `allowListed` (existing helpers untouched — the change is additive).
4. Consumers: **none of the six status readers needs to change**, with two exceptions that are precedence bugs, not obstacles — `features/check-your-answers/controller.js:110` (`obligation.status ?? record?.status ?? …` — static-first, so it would *mask* a per-record status) and `:272`. Plus `features/units/controller.js:198-199` reads the static property for a seed-page ordering heuristic (cosmetic).

This is the textbook "not built vs cannot be built" failure the method warns about. A model whose record schema carries the field, whose resolver keys by path, whose walkers default `record.status ?? 'mandatory'`, and whose **test suite already exercises mixed per-record statuses**, is a model that would happily accept per-record mandate. Nobody wired the producer.

## Step 3 — counter-example hunt #2: is record ABSENCE really B's only per-record lever?

No. Two other channels exist, one of which is fully honoured in the status model.

**(a) The group invariant IS a conditional mandate below notification level — and it is state-dependent per instance.**
`groupInvariantErrors` (`engine/index.js:512-539`) recomputes, **per group instance**, which required leaves are in scope for *that* instance (`:519-523`), skips the instance entirely when none are (`:524` — vacuous satisfaction), and otherwise demands ≥1 non-blank. Since the six unit identifiers are derived-leaf obligations gated per unit by the parent line's commodity code (`obligations.js:631-704` — `passport`/`tattoo`/`earTag`/`horseName` allowlisted by code; `identificationDetails`/`description` by the inverse predicate), the mandate that unit-record N carries **varies with N's own data**. And it is not a side-channel: it is folded into the same classifier as ordinary mandates via `groupErrorCount` (`engine/index.js:398-400`), so it drives hub tags, CYA prompts and journey status.
So "B structurally cannot express a conditional mandate below notification level" is false as stated. B expresses one, per unit record, in the manifest, today. What B cannot express is the **per-field status flip** — that is a much narrower claim.

**(b) The domain predicate gives a per-record enforcement mandate, authorable as data.**
`validate(obligation, value, fulfilments, domain, ctx)` (`engine/index.js:61-103`) builds `predicateCtx = { fulfilments, path, siblingValue, ids }` where `siblingValue(o)` reads the sibling's value **at the same path** (`:66-73`), and runs `entry.predicate` unconditionally — including on blank values (`:99-101`; the blank short-circuit at `:79-81` only skips the enum-options check). `contract.validatePagePayload` calls it per descriptor with `{ path: descriptor.path }` (`contract.js:284-290`), and descriptors on a `presentsForEach` page are one-per-record. `domain/index.js` already uses `ctx.path` for real per-line behaviour (`:494-497`, per-line computed enum).
So "blank is an error on horse lines, fine on cattle lines" is authorable **today, as data, with no engine change, no record absence, and no purge**. Caveat that keeps this an amendment rather than a refutation: that channel is *enforcement without status* — it blocks the save but is invisible to `classifyEntries`, the CYA prompts and `journeyState`. You would get a page that rejects the save while the task list calls the field optional. It buys the gate, not the model.

## Step 4 — doc-vs-code

The claim credits nothing to `obligations.md` that the code fails to honour; it correctly catches the doc **over**claiming at `:242`. Independently confirmed. No `get status()` accessor anywhere in `obligations.js` (grepped) — the property really is a static literal, not a lazy getter like `requires.anyOf`.

## What stands, precisely

- Group-scoped record status is `obligation.status`, static; the `applyTo` status is discarded. **Stands, verbatim.**
- No helper can produce a per-record status; no obligation in the manifest attempts one. **Stands.**
- A derived-leaf record leaving the allowlist purges its stored value, with no opt-out flag anywhere. **Stands** (scoped to derived-leaf).
- Same-field "present-and-optional on cattle lines, present-and-mandatory on horse lines" has **no expression today**. **Stands.**
- "**Structurally** cannot" — **falls.** Producer-only gap; contract, resolver, classifier, both walkers, the proceed gate and the existing tests are all already per-record.
- "B's only per-record mandate-off is record ABSENCE" — **falls.** The `requires.anyOf` group invariant is a per-instance, state-dependent mandate that IS honoured in status; the domain predicate's `ctx.path`/`siblingValue` is a second, tested, data-level per-record channel.

## Consequence for the shopping list

C2 should stop being an "A can, B structurally cannot" asymmetry and become a **retrofit line item with a small price tag**: ~8 LOC in `evaluator.js` (3 record branches + the purge Set), one additive helper factory, and fixing the static-first precedence at `check-your-answers/controller.js:110,272`. The genuinely asymmetric residue is narrower and worth stating on its own: (1) A's `wipeOnExit` — B has **no** retain-on-scope-exit opt-out at record level and would need one (grep: zero hits); (2) A's `activatedBy` gives the per-path condition a *statically introspectable* form, where B's would remain a closure return. Neither is "cannot express"; both are real costs.
