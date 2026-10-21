# EUDPA-277 — Obligations model recommendation

Spike: validate the obligations model from EUDPA-249
(`../obligations/`) against
[Live Animals Data Fields V4](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582).

---

## Verdict

**Adopt the obligations model with extensions.**

The V3 model handles the Live Animals V4 domain cleanly once one
machinery gap is closed. The extensions are small, contained in the
evaluator plus a companion helper library, and don't disturb the core
model shape from EUDPA-249.

Concrete evidence:

- **All 42 V4 obligations expressed as code.** Every field from the
  Confluence spec that is in scope. See `obligations.js`.
- **Every V4 conditional pattern is supported** without needing an
  ad-hoc / bespoke shape.
- **181 tests green** covering the helpers, the evaluator units, and
  integration through the manifest.
- **Every obligation is testable at obligation level** as a plain
  function call with plain inputs — no evaluator, no resolver, no
  `obligationsById` construction required.

Not "as-is" because the depth-2 commodity-gated pattern (per-unit
identifiers) exposed a machinery gap that the V3 model couldn't
express without in-obligation storage enumeration. Not "needs
replacing" because the extension is small: `applyTo`'s signature
grows by one argument, the pipeline gains a pre-purge enumeration
step, and a small helper library ships alongside.

---

## What "with extensions" means concretely

Four changes vs the V3 model at `../obligations/`:

1. **`applyTo` signature extended** from `applyTo(fulfilments)` to
   `applyTo(fulfilments, fulfilmentIdsByObligationId)`. The second arg
   is a `Map<obligationId, string[]>` of currently-present
   group-instance-paths, letting gated obligations look up their
   parent-group's instance-paths without in-obligation storage
   enumeration.

2. **Pre-purge enumeration step** added to the pipeline
   (`enumerateGroupPathsFromStorage` in `evaluator.js`). Runs after
   step 1 (drop unknowns) and before step 3 (`runApplicabilityDecisions`),
   feeding the ids map to every applyTo call.

3. **Classifier extended** so `applyTo + within` (no `indexedBy`)
   classifies as `derived-leaf`. Preserves the V3 behaviour for
   obligations that used `indexedBy.source === 'derived'` while
   admitting the migrated shape where `numberOfPackages` and friends
   express their gate declaratively via helpers rather than a raw
   `applyTo` returning `records`.

4. **Helper library shipped** (`helpers.js`) providing pure functions
   that build applyTo functions for common gate shapes:
   `allowListed`, `allowListedByPredicate`, `branchedGate`,
   `anyAllowListed`, plus lower-level `matches` and `present`. Each
   returned function has a `.metadata` property describing the gate
   declaratively for optional introspection / cross-language export.

Backwards-compatible with the V3 shape: obligations that don't
consume the second `applyTo` arg still work; obligations without
`applyTo` are handled as before.

---

## V4 pattern coverage

Every V4 conditional shape is expressible under the extended model
using either a helper or a plain applyTo closure. Non-exhaustive
tour:

| V4 pattern                                 | Model shape                                                                              | Example obligation                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Always-mandatory scalar                    | `applyTo: () => ({ inScope: true, status: 'mandatory' })`                                | `countryOfOrigin`                                               |
| Always-optional scalar                     | `applyTo: () => ({ inScope: true, status: 'optional' })`                                 | `internalReferenceNumber`                                       |
| Retain-value scalar (mandatory-when-gated) | `branchedGate(pred, whenMandatory, whenOptional)`                                        | `regionCode`                                                    |
| Purge-on-flip scalar                       | `branchedGate(pred, whenInScope, { inScope: false })`                                    | `purposeInInternalMarket`                                       |
| Mutually-exclusive pair                    | Two obligations each with `branchedGate` gated on the same trigger with different values | `commercialTransporter` / `privateTransporter`                  |
| Optional multi-select gated                | `branchedGate` with in-scope-optional branch and array storage                           | `transitedCountries`                                            |
| Structural group                           | `{ id, name, within? }` — no `applyTo`                                                   | `commodityLine`, `unitRecord`                                   |
| Field record inside a group                | `{ within, status }` — no `applyTo`                                                      | `commodityCode`, `commodityType`                                |
| Multi-select field record                  | Same as field record; stored value is an array                                           | `species`                                                       |
| Per-line commodity-gated (depth-1)         | `allowListed(commodityCode, WHITELIST, null, reasons)`                                   | `numberOfPackages`                                              |
| Notification-level aggregation             | `anyAllowListed(commodityCode, WHITELIST, whenTrue, whenFalse)`                          | `cph`                                                           |
| Per-unit commodity-gated (depth-2)         | `allowListed(commodityCode, WHITELIST, unitRecord, reasons)`                             | `passport`, `tattoo`, `earTag`, `horseName`, `permanentAddress` |
| Inverse commodity gate (depth-2)           | `allowListedByPredicate(commodityCode, predicate, unitRecord, reasons)`                  | `identificationDetails`, `description`                          |
| Cross-sibling all-or-nothing               | Shared `branchedGate` referencing all siblings via closure                               | Accompanying document block                                     |

---

## Mechanism choice — narrative

Two mechanisms were prototyped during the spike:

1. **Declarative `gatedBy` DSL** — combinator constructors
   (`allowListed`, `and`, `not`, `or`, `present`, `any`, `every`)
   returning tagged data structures, plus an interpreter
   (`gate-resolver.js`) that walks the tree and produces per-instance-path
   scope decisions. Landed through step 4 and step 5 (see history
   `c79fbd0`).

2. **`applyTo` + helpers** — small library of pure helper functions
   that build `applyTo` functions consuming the `fulfilmentIdsByObligationId`
   map. Prototyped alongside gatedBy (`a17a9a1`).

Both handled every V4 shape. The trade-off surfaced by side-by-side
prototyping — the applyTo prototype landed as
`obligations-all-applyto.js` plus tests (since removed after the
migration):

| Property                                  | gatedBy DSL                                        | applyTo + helpers                                       |
| ----------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Author brevity for common cases           | ~3 lines                                           | ~3 lines (with helpers)                                 |
| Vocabulary to learn                       | 8 combinators + resolver semantics                 | 0 — JS + helper library                                 |
| Testable at obligation level              | Requires resolver + `obligationsById` construction | Plain function call with plain inputs                   |
| Debuggable                                | Data + interpreter (walk the tree)                 | Native breakpoints, `console.log`                       |
| Cross-sibling ergonomics (all-or-nothing) | Attach-after-declaration mutation required         | Closures over `const` resolve at call time; no mutation |
| Compose with JS operators                 | No — need combinators                              | Yes — logical operators, spreads, array methods         |
| Static introspection                      | Native (walk the tree)                             | Only via helper `.metadata`                             |
| Cross-language export                     | Native (gate is data)                              | Only via helper `.metadata`                             |
| Helper functions unit-testable            | N/A (interpreter is the atom)                      | Yes — pure functions                                    |

**Chosen: applyTo + helpers.** The idiomatic-JS + obligation-level
testability + cross-sibling ergonomics wins outweighed the
introspection / cross-language wins of the DSL. Introspection is
reclaimed selectively through helper `.metadata`.

**When we'd reconsider:** if the model needs to inform a Java backend's
validation logic (e.g. same gates enforced server-side), then the
gate-tree-as-data property becomes valuable. See "Risks / open
questions" below.

---

## Gaps and resolution

### Gap 1 — identity-space mismatch when a gate is at a broader identity level than the gated obligation

_(machinery gap — closed)_

Depth-N obligations gated by shallower-identity obligations need
their scope-resolution logic to produce composite paths at their own
identity level. Under V3's `applyTo(fulfilments)` signature the
obligation code had no way to look up group-instance-paths without
scanning sibling storage itself — duplicating enumeration logic the
evaluator already implements.

Closed by the four extensions listed above. See `GAPS.md` §Gap 1 for
worked examples and options-considered.

### Non-gaps flagged for the team

- **"At least one identifier per unit"** — the V4 spec calls this a
  "field block, mandatory to submit, at least one." That's a
  cross-sibling _cardinality_ constraint, not a scope decision. The
  obligation model deals with scope. Handle at the validation layer
  (frontend + backend) when the notification is submitted.

- **`animalsCertifiedFor`** — V4 spec notes "APHA intend to make this
  conditional for some commodities. Pending confirmation." Currently
  modelled as always-mandatory notification-level. If APHA confirms
  commodity-gating, refactor to `anyAllowListed(commodityCode, LIST,
whenTrue, whenFalse)` — small change, same pattern as CPH.

- **Line-instance-id keying vs code-value keying** — `numberOfPackages`
  and similar per-line records are stored under line-instance-ids
  (opaque ULIDs in production), not commodity code values, because
  two lines can share a code and each needs an independent answer.
  Reader-facing docs, not a gap. See `GAPS.md` §Note.

---

## What we did NOT prove

- **Performance under load.** The evaluator is pure and runs in tens
  of milliseconds against the full V4 manifest with realistic
  fulfilments. Not stress-tested at scale, though.
- **Cross-language interoperability.** The `.metadata` hook on
  helpers gives a partial data-view; not a formal specification.
- **Journey / page / navigation.** Explicitly out of scope per the
  ticket AC. A follow-up ticket will implement the journey on top of
  the validated model.
- **Backend integration.** Whether the backend consumes this model,
  a compiled data-view of it, or a separate rules engine is a
  broader architecture decision the spike didn't touch.
- **System-populated fields** (Reference Number, gov.identity fields,
  MDM enum values). Stubbed as pre-filled fulfilments in tests per
  the Q4 scoping decision at the start of the spike. When the
  journey wires those up, model authors should decide obligation by
  obligation whether to add them (as always-in-scope with a
  `source: 'system'` metadata field) or continue to treat them as
  externally-populated.

---

## Follow-on work (see `TODO.md`)

- **Debug pretty-printer for cross-obligation storage joins.** A
  helper that produces a human-readable trace joining storage across
  obligations (e.g. "line2 [commodityCode = 01064100 (bees)]:
  numberOfPackages = 3"). Complements the flat composite-key
  storage; not blocking.
- **Data-dictionary exporter via helper metadata.** Walk the
  manifest, read `.applyTo.metadata` for each obligation, emit a
  data-dictionary format for downstream consumers.

---

## Risks / open questions for the team

1. **Cross-language export.** If the backend needs to enforce the
   same gates as the frontend from the same source of truth, decide
   between:
   - Building the data-dictionary exporter above and generating
     backend validators from it.
   - Consuming helper `.metadata` directly server-side (Java can
     interpret the same tagged structures).
   - Duplicating the manifest in Java (accept the drift risk).

   Recommendation: build the exporter when there's a concrete
   consumer, not speculatively.

2. **Model migration path from V3.** The obligations model exists in
   two places now: the V3 spike at `../obligations/` (car-insurance
   exemplar, sealed as "the model under test" per this ticket's AC)
   and this V4-extended version. The V3 code doesn't have the
   `fulfilmentIdsByObligationId` map. If any other consumer of the V3
   model exists (currently none), coordinate the extension.

3. **"Retain-value" vs "purge-on-flip"** — every conditional single
   in the manifest picks one. Team should agree these are the right
   choices for each field. Some are per-V4-spec (`regionCode`
   retains), others are a modelling call (`purposeInInternalMarket`
   purges). All documented as reason strings in the manifest.

4. **`species` as multi-select array** — currently opaque to the
   model. If a downstream obligation needs to gate per-species (e.g.
   "additional identifier X required for cattle _and_ Bison bison"),
   the multi-select would need controller-like treatment. Not needed
   for V4 as spec'd; flag if the spec evolves.

---

## Where the spike output lives

Branch `spike/EUDPA-277-obligations-v4-model` in
`DEFRA/trade-imports-animals-frontend`.

Path: `prototypes/model-spikes/obligations-v4-model/`.

Files (post-close):

| File                      | Purpose                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `obligations.js`          | V4 manifest — 42 obligations expressed via `applyTo` + helpers                                                   |
| `helpers.js`              | Helper library — `allowListed`, `allowListedByPredicate`, `branchedGate`, `anyAllowListed`, `matches`, `present` |
| `evaluator.js`            | Extended V3 evaluator                                                                                            |
| `helpers.test.js`         | 24 helper unit tests                                                                                             |
| `evaluator.units.test.js` | 61 evaluator function unit tests                                                                                 |
| `evaluator.test.js`       | 96 integration tests through the V4 manifest                                                                     |
| `GAPS.md`                 | Gap 1 detail + worked examples                                                                                   |
| `TODO.md`                 | Deferred work — pretty-printer, data-dictionary exporter                                                         |
| `RECOMMENDATION.md`       | This document                                                                                                    |

Full git history walks the discovery path (steps 1-5 modelling walk,
step 4a gatedBy prototype, applyTo-consolidation migration).

---

## Suggested next steps

1. **Playback to team.** Walk through this document + a live look at
   `obligations.js`. Get sign-off on the "with extensions" verdict
   and the mechanism choice.
2. **Raise the follow-up ticket** for building the journey on top of
   the validated model.
3. **Decide on backend integration** direction (see risk #1) before
   the follow-up ticket starts — the answer affects whether the data-
   dictionary exporter needs to be in scope for that iteration.
4. **Address the two open V4 spec ambiguities**:
   - "APHA intend to make animalsCertifiedFor conditional for some
     commodities. Pending confirmation."
   - "Where applicable for given commodity, user is able to filter
     species by type" — is `commodityType` commodity-gated?
5. **Merge or seal the branch.** This branch is a spike artifact.
   Either merge to main as the model source-of-truth for follow-up
   work, or keep as a reference and re-implement in a fresh module
   under the frontend `src/` tree.
