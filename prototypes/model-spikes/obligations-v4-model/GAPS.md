# Obligations V4 spike — gap log

Gaps discovered while modelling
[Live Animals Data Fields V4](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582)
against the obligations model from the EUDPA-249 spike
(`../obligations/`). Feeds `RECOMMENDATION.md`.

Each entry: the pattern hit, the obligation(s) affected, whether it's
a machinery gap or conceptual, and what was done to close it.

---

## Gap 1 — identity-space mismatch when a gate is at a broader identity level than the gated obligation

**Pattern:** An obligation gated by another obligation whose stored
identity space is _broader_ (fewer dimensions) than its own. The
gated obligation's scope-resolution logic needs to enumerate the extra
dimensions to produce composite paths at its own identity level.

**Obligation(s) affected:** all step-4 per-unit identifier fields
(`passport`, `tattoo`, `earTag`, `horseName`, `identificationDetails`,
`description`, `permanentAddress`) — each gated by `commodityCode`
(per-line) but stored per-unit (per-line × per-unit). And
`numberOfPackages` at depth-1 (gated by same-level `commodityCode`).
The general shape recurs whenever a gate crosses identity levels;
not depth-2-specific.

**Type:** _Machinery gap._ The v3 spike's `applyTo(fulfilments)`
signature gave obligation code no way to look up group-instance-paths
without scanning sibling storage itself — duplicating enumeration
logic the evaluator already implements.

**Extension made:** Yes — closed by extending `applyTo`'s signature to
`applyTo(fulfilments, fulfilmentIdsByObligationId)` where the second
arg is a `Map<obligationId, string[]>` of currently-present
group-instance-paths, enumerated pre-purge from raw storage. See
`evaluator.js`'s `enumerateGroupPathsFromStorage` (step 2) and
`runApplicabilityDecisions` (step 3).

A small helper library builds common gate shapes on top of this
signature, so obligation authors don't touch the enumeration machinery
directly. See `helpers.js`:

- `allowListed(gateObl, values, projectionGroup?, reasons?)` —
  in scope where the gate's stored value is in the allowlist. If
  `projectionGroup` is supplied, project matches down to that group's
  instance-paths (depth-N gates); otherwise records are the passing
  gate keys directly (depth-1 same-level gates).
- `allowListedByPredicate(gateObl, predicate, projectionGroup?, reasons?)` —
  same but with a predicate function (for inverse gates,
  compound conditions).
- `branchedGate(predicate, whenTrue, whenFalse)` — evaluate a predicate
  and return one of two decision objects. For retain-value +
  status-swap patterns (`regionCode`, all-or-nothing blocks).
- `anyAllowListed(gateObl, values, whenTrue, whenFalse)` — scalar
  aggregation: true if any of the gate's stored values matches. For
  notification-level obligations gated by per-record data (CPH).

Each helper returns a pure applyTo function with `.metadata` attached
for optional introspection / cross-language export.

### Why applyTo + helpers over a declarative gate DSL

Both approaches were prototyped (see git history:
`c79fbd0` gatedBy, `a17a9a1` applyTo prototype). The applyTo shape won
on:

- **Idiomatic JS** — no DSL, no interpretation layer. Standard debug
  tools work everywhere.
- **Testable at obligation level without other units** — each
  `obligation.applyTo(fulfilments, ids)` is a plain function call
  with plain inputs. No evaluator, no resolver, no `obligationsById`
  to construct.
- **Cross-sibling ergonomics** — closures over `const` bindings resolve
  names at call time, so patterns like the accompanying-document
  all-or-nothing block avoid the attach-after-declaration mutation
  that the DSL approach required. Each obligation self-contains its
  applyTo.
- **Composes with JS operators** — `&&`, `||`, `!`, spreads,
  `.filter()`, `.map()` — no combinator wrappers.
- **Helpers themselves are unit-testable** — pure functions.

Static introspection is reclaimed selectively via helper metadata:
`obligation.applyTo` is a function (runtime); `obligation.applyTo.metadata`
is a data structure (tooling / data-dictionary export / cross-language
serialisation). Custom one-off applyTos just omit metadata.

### Worked example — numberOfPackages (depth-1)

```js
export const numberOfPackages = {
  id: '...',
  name: 'numberOfPackages',
  within: commodityLine,
  status: 'optional',
  applyTo: allowListed(
    commodityCode,
    PACKAGE_COUNT_COMMODITIES,
    null, // no projectionGroup — gate and gated at same level
    [numberOfPackagesReason]
  )
}
```

Storage keys are line-instance-ids. Records list contains only
matching lines. No in-obligation enumeration.

### Worked example — passport (depth-2)

```js
export const passport = {
  id: '...',
  name: 'passport',
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(
    commodityCode,
    PASSPORT_COMMODITIES,
    unitRecord, // project to unitRecord's instance-paths
    [passportReason]
  )
}
```

Under the hood the helper takes the pre-purge
`fulfilmentIdsByObligationId.get(unitRecord.id)` array and filters it
to units whose parent-line's code is in the allowlist. The obligation
code doesn't enumerate; the pipeline hands over the paths.

### Worked example — CPH (aggregation to scalar)

```js
export const cph = {
  id: '...',
  name: 'cph',
  applyTo: anyAllowListed(
    commodityCode,
    CPH_REQUIRED_COMMODITIES,
    { inScope: true, status: 'mandatory', reasons: [cphReason] },
    { inScope: false }
  )
}
```

Reads across `commodityCode`'s per-line map and returns a scalar
decision. No projection needed (target is a scalar obligation).

### Worked example — accompanying document all-or-nothing (cross-sibling)

```js
const anyDocumentFieldPresent = (fulfilments) =>
  [
    accompanyingDocumentType,
    accompanyingDocumentAttachmentType,
    accompanyingDocumentReference,
    accompanyingDocumentDateOfIssue
  ].some((obligation) => fulfilments[obligation.id] !== undefined)

const accompanyingDocumentBlockApplyTo = branchedGate(
  anyDocumentFieldPresent,
  { inScope: true, status: 'mandatory', reasons: [...] },
  { inScope: true, status: 'optional' }
)

export const accompanyingDocumentType = {
  id: '...',
  applyTo: accompanyingDocumentBlockApplyTo
}
// same applyTo shared across all four fields
```

Predicate is a closure over the four const bindings; sibling names
resolve at call time. No attach-after-declaration mutation, no shared
gate structure.

### Options considered, not taken

- **In-applyTo enumeration** (option A′) — obligation code scans
  sibling storage to reconstruct group instances. Ugly at depth-2+;
  duplicates evaluator logic; couples obligation code to storage
  internals. Rejected.
- **New `conditional-field` category with per-instance
  `applyTo(fulfilments, instancePath)`** (option D) — cleaner
  per-instance mental model but requires bigger evaluator changes
  (classifier + per-instance purge + per-instance implication
  branches) and higher author cost per obligation. Rejected.
- **Declarative gatedBy DSL** (options F+G) — landed as a prototype
  and used through step 4 and 5. Same brevity as applyTo + helpers
  for common cases, plus native introspection. Rejected in favour of
  applyTo + helpers on the idiomatic-JS, obligation-level-testability
  and cross-sibling-ergonomics grounds listed above. The metadata
  hook on helpers reclaims introspection selectively.
- **Denormalise storage** (`{ line2: { value: 3, commodityCode: '01064100' } }`)
  — two sources of truth; kept-in-sync burden; storage-shape
  pollution. Rejected.
- **Encode meaning into keys** (`'commodityCode-01064100-uuid': 3`)
  — confuses identity with description; semantic drift on value
  flips. Rejected.

---

## Note — line-instance-id keying (not a gap)

Not a machinery gap but worth capturing for future readers.
`numberOfPackages`-style depth-1 records are stored under
line-instance-ids, not commodity code values, because two lines can
share a code and each needs an independent answer.

```js
// Storage — keyed by line-instance-id
fulfilments[numberOfPackages.id] = { line2: 3 }

// NOT keyed by commodity code value (would collapse two-lines-same-code):
// fulfilments[numberOfPackages.id] = { '01064100': 3 }  // ← wrong
```

Line-instance-ids are opaque orchestrator-generated ULIDs in
production; tests use readable mnemonic constants (`LINE_BEES =
'line2'` etc.) so intent is scannable — see `evaluator.test.js`.
