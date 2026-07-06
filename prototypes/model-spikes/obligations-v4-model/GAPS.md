# Obligations V4 spike — gap log

Running log of gaps discovered while modelling
[Live Animals Data Fields V4](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582)
against the obligations model from the EUDPA-249 spike (`../obligations/`).

Each entry records: the pattern hit, the obligation(s) affected, whether
it's a machinery gap or a conceptual/naming gap, and what (if
anything) was done to close it. Feeds `RECOMMENDATION.md` at the end
of the spike.

---

## Gap 1 — `derived-leaf` category covers more than pass-through controllers

**Pattern:** Field record inside a group, in scope conditionally on the
same line's answer to a sibling field.

**Obligation(s) affected:** `numberOfPackages` (this spike). Likely
recurs for `commodityType` if it turns out to be commodity-gated, and
for any future field of the form "per-line record, applicable only for
some commodity codes."

**Type:** _Conceptual / naming_ — the evaluator handles this case
without change. The mismatch is between the mental model
`derived-leaf` invites (established by the v3 spike's `modificationCost`
exemplar and `FULFILMENT_SHAPES.md` §E) and how V4 has to use it.

**Extension made:** None to machinery. `numberOfPackages` uses
`indexedBy: { source: 'derived', controllingObligation: commodityCode }`
with an `applyTo` that filters + projects `commodityCode`'s stored
map. Purge behaviour is correct out-of-the-box. See obligations.js and
the worked example below.

### The mismatch, worked through

**The v3 pattern.** `modificationCost` is derived from `modifications`
— a top-level multi-select storing an array:

```js
fulfilments[modifications.id] = ['turbo', 'alloys']

// derived-leaf applyTo passes those values through as record-ids:
records: fulfilments[modifications.id] ?? []
// → ['turbo', 'alloys']

// storage keys are the mod names themselves:
fulfilments[modificationCost.id] = { turbo: '800', alloys: '400' }
```

Reading `controllingObligation: modifications` tells the reader exactly
where the record-ids come from — they _are_ the controller's stored
values. `FULFILMENT_SHAPES.md` §E states this explicitly:

> Derived fulfilment ids are the controller's answer values, not
> opaque ids.

**The V4 pattern.** `numberOfPackages` is derived from `commodityCode`
— a per-line field record storing a keyed map:

```js
fulfilments[commodityCode.id] = {
  line1: '00000001', // made-up code, not in the packages-required list
  line2: '01064100', // bees — in the list
  line3: '01063100' // owls — in the list
}
```

The `applyTo` filters those entries and returns the **line-instance
ids** where the code is in the allowlist, not the code values
themselves:

```js
records: Object.entries(fulfilments[commodityCode.id])
  .filter(([_, code]) => PACKAGE_COUNT_COMMODITIES.includes(code))
  .map(([lineId]) => lineId)
// → ['line2', 'line3']
```

Storage keys are line-instance ids (opaque ULIDs in production):

```js
fulfilments[numberOfPackages.id] = { line2: 3 }
```

### Why the strong reading fails

Reading `controllingObligation: commodityCode` and applying the v3
pattern, a reader would expect record-ids to be the code values
`['00000001', '01064100', '01063100']` and storage keyed like
`{ '01064100': 3 }`. Two problems:

1. **Non-unique keys.** Commodity codes are not unique across lines.
   Two lines can both be bees, each with its own packages count. The
   code-keyed shape `{ '01064100': 3 }` cannot represent
   "`line2` = 3 packages, `line3` = 5 packages" — the entries collapse
   to one. Line-instance-id keying preserves independence:
   `{ line2: 3, line3: 5 }`.

2. **`FULFILMENT_SHAPES.md` §E's absolute claim is false here.** The
   derived record-ids ARE opaque ids (ULIDs), not answer values. The
   doc's clean rule needs a caveat.

### What we did instead

- Documented the pattern in `obligations.js` at `numberOfPackages`'s
  declaration with a comment header explaining the reuse and the
  line-instance-id keying.
- Tests use named line-id constants (`LINE_BEES = 'line2'` etc.) so
  the reader can see intent without decoding opaque ids — see
  `evaluator.test.js` step-3 blocks.
- This entry logs the gap for the recommendation write-up.

### Options considered, not taken

- **Extend the evaluator with a new `conditional-field` category.**
  First-class semantics for "field record with per-instance `applyTo`".
  Cleaner mental model, but requires classifier + purge + implication
  branch updates. Deferred — reuse fits without machinery change.
- **Denormalise storage** (e.g. `{ line2: { value: 3, commodityCode:
'01064100' } }`). Two sources of truth; kept-in-sync burden;
  storage-shape pollution. Rejected.
- **Encode meaning into keys** (e.g. `'commodityCode-01064100-uuid':
3`). Confuses identity with description; semantic drift when the
  user changes the code answer. Rejected.
- **Debug pretty-printer** for storage joins — see `TODO.md`. Not
  taken as an alternative; would complement docs+tests.

### Update after iteration 4a

Iteration 4a landed the `gatedBy` substrate (see §Gap 2 below), which
subsumes the derived-leaf reuse pattern with a cleaner surface.
`numberOfPackages` remains on the derived-leaf reuse for now; refactor
to `gatedBy` is scheduled as part of 4c backfill of steps 1-3.

---

## Gap 2 — identity-space mismatch when a gate is at a broader identity level than the gated obligation

**Pattern:** An obligation gated by another obligation whose stored
identity space is _broader_ (fewer dimensions) than its own. The
gated obligation's `applyTo` has to enumerate the extra dimensions
itself, because the model previously exposed no way to ask the
evaluator for group-instance-ids at the target identity level.

**Obligation(s) affected:** All step-4 per-unit identifier fields
(`passport`, `tattoo`, `earTag`, `horseName`, `identificationDetails`,
`description`, `permanentAddress`) — each gated by `commodityCode`
(per-line) but stored per-unit (per-line × per-unit). The mismatch
appears whenever a gate crosses identity levels; not depth-2-specific.
Would recur on any depth-1 field gated by a notification-level value,
any depth-2+ field gated by a shallower field, and so on. See the
"corrected mental model" in the design discussion for the general
rule.

**Type:** _Machinery gap._ Every workaround on the current substrate
was structurally unsatisfying — either duplicate enumeration logic
inside every obligation's `applyTo` (ugly, coupling to storage
internals), denormalise storage (kept-in-sync burden), encode
description into keys (identity confusion under value flips), or
model as unconditional and drop purge semantics.

**Extension made:** Yes — closed by the `gatedBy` substrate landed in
iteration 4a.

Concretely:

- `gates.js` — data-only combinator constructors (`allowListed`,
  `matches`, `present`, `and`, `or`, `not`, `any`, `every`).
- `gate-resolver.js` — interpreter that walks a gate tree, reads
  storage, projects between identity levels (expand via
  `enumerateInstancePaths`, aggregate via `any` / `every`), and
  produces per-instance-path scope decisions.
- `evaluator.js` — integrated as a new step 2 phase (`runGateResolutions`)
  running alongside `runApplicabilityDecisions`; `makeInScopeCheck`
  extended to treat "any path in scope" as own-scope-true;
  `purgeStorage` extended with a `gatedBy` branch (helper
  `purgeGatedStorage`) that filters records per-path; `buildImplication`
  extended with a `gatedBy` branch (helper `buildGatedImplication`)
  that builds records from in-scope decisions.

Author-facing shape (from `obligations.js`):

```js
export const passport = {
  ...,
  within: unitRecord,
  status: 'optional',
  gatedBy: allowListed(commodityCode, PASSPORT_COMMODITIES)
}

export const identificationDetails = {
  ...,
  within: unitRecord,
  status: 'optional',
  gatedBy: and(
    not(allowListed(commodityCode, PASSPORT_COMMODITIES)),
    not(allowListed(commodityCode, TATTOO_COMMODITIES)),
    not(allowListed(commodityCode, EAR_TAG_COMMODITIES)),
    not(allowListed(commodityCode, HORSE_NAME_COMMODITIES))
  )
}
```

Both take ~3-4 lines of declarative data. Enumeration, projection,
purge, implication-building — all handled by the resolver + evaluator.
Adding new depth-2 (or depth-N) commodity-gated fields is now a
cut+paste-a-shape operation.

### Options considered, not taken

- **A′ — Derived-leaf reuse extended to depth-2 with in-`applyTo`
  enumeration.** Every gated obligation's `applyTo` would duplicate
  the group-enumeration logic the evaluator already implements. Ugly,
  coupled to storage internals, doesn't scale beyond depth-2 without
  further duplication. Rejected.
- **B — Derived-leaf + evaluator helpers.** Adds
  `applyTo(f, { enumerateChildInstancesOf })` and keeps derived-leaf
  as the category. Cleaner than A′ but still imperative; leaves the
  category taxonomy fragmented; scale-only fix. Rejected in favour of
  the declarative surface.
- **C — Always-in-scope field records with UX-layer gating.** No
  machinery change; loses per-unit purge semantics; storage
  accumulates orphaned values on non-applicable units. Rejected.
- **D — New `conditional-field` category with per-instance
  `applyTo(fulfilments, instancePath)`.** Cleaner per-instance mental
  model but requires bigger evaluator changes (classifier + per-
  instance purge + per-instance implication branches). Author cost
  higher than declarative gates for the common allowlist case.
  Rejected in favour of F+G (declarative) as the primary surface.

### Author-facing readability of gates

The declarative combinators keep gates self-documenting. For any gate
that doesn't fit the combinator vocabulary, `applyTo` remains as an
escape hatch, so nothing loses expressiveness.

Follow-on work (see `TODO.md`):

- Backfill steps 1-3 obligations to use `gatedBy` (this is the "4c"
  iteration of the outer plan).
- Land the identity-space uniform substrate ("4b" — collapse legacy
  categories `single` / `field` / `derived-leaf` / `user-leaf` into
  a `keyspace` metadata dimension, unify the pipeline). Independent
  of this gap but the substrate refactor benefits from having
  `gatedBy` already in place.
