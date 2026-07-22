# Worked examples index

Four workstreams landed on top of the base spike (WS1-WS4). Each one
extended the model in a materially different shape, so the four
`PLAN-*.md` files at the spike root double as canonical worked
examples. If you're adding an obligation and want to see the end-to-
end pattern for a similar shape, start here.

Cross-reference to [`pick-a-shape.md`](./pick-a-shape.md) for the
"which of these do I need" decision tree; this page is the
worked-example index.

## WS1 — Reason-gated notification-level scalars

**File:** [`../PLAN-reason-gated-fields.md`](../PLAN-reason-gated-fields.md)

**Adds:** `destinationCountry`, `portOfExit`, `exitDate` — three
notification-level scalars conditionally in-scope based on
`reasonForImport`.

**Shape demonstrated:** conditional-scope scalars with purge-on-flip.
Two `includesGate` (2-value trigger) + one `equalsGate` (1-value
trigger). All three go out-of-scope when the trigger doesn't match,
so any stored value is purged by the evaluator.

**Read this when:** the spec says "required when Y is X" or "required
when Y is one of [A, B, C]" and the value has no meaning off the
gate.

**Key commit:** [`0382e13`](https://github.com/DEFRA/trade-imports-animals-frontend/commit/0382e13)

## WS2 — Notification-level scalar all-or-nothing block

**File:** [`../PLAN-accompanying-doc-block.md`](../PLAN-accompanying-doc-block.md)

**Adds (retired in WS4):** structural container `accompanyingDocument`
carrying `requires.allOrNothingOfIds` naming four scalar member
fields.

**Shape demonstrated:** a group-level invariant reading scalar
`state.fulfilments` (not records) to enforce "all four filled or none
filled" symmetrically. Introduced the container back-ref plumbing
(`member.containers` populated at manifest export, walked by
`collectGroupsPresentedIn` in the engine).

**Read this when:** you have a small set of notification-level scalars
that must all be filled together or all left blank, without needing
records-shape storage. Note WS4 upgraded this specific block to a
records shape because the spec turned out to allow 0..10 — but the
container + invariant primitive is still in the engine and available
for future scalar all-or-nothing blocks.

**Key commit:** [`f857230`](https://github.com/DEFRA/trade-imports-animals-frontend/commit/f857230)

## WS3 — Cross-group per-parent count invariant

**File:** [`../PLAN-unit-count-invariant.md`](../PLAN-unit-count-invariant.md)

**Adds:** `requires.recordCountEquals` invariant kind, wired into
`unitRecord.requires` reading `numberOfAnimals`. Ensures that per
commodity-line instance, the number of unit records equals the scalar
`numberOfAnimals` for that line.

**Shape demonstrated:** a cross-group invariant that reads records
from one group AND a scalar from a sibling within the parent group,
per parent instance. Fires one error per mismatched line with
`{expected, actual}`. Rollup-only (no purge on either direction).

**Read this when:** the spec has a rule like "count of records on
line X must equal the scalar quantity declared on line X". Common in
domain models where "records ARE units of the counted thing".

**Key commit:** [`d30b652`](https://github.com/DEFRA/trade-imports-animals-frontend/commit/d30b652)

## WS4 — Records-shape 0..10 user-driven group

**File:** [`../PLAN-accompanying-doc-indexed.md`](../PLAN-accompanying-doc-indexed.md)

**Adds:** `accompanyingDocument` reshaped from WS2's scalar container
into a records-shape user-driven group. Four member fields moved
`within: accompanyingDocument, status: 'mandatory'`. Added `maxEntries`
invariant kind. New feature dir + per-record page controller +
add/delete helpers. Retired the WS2 `allOrNothingOfIds` invariant on
this specific site.

**Shape demonstrated:** upgrading from notification-level scalars to a
records-shape group. Every piece of the pattern lands together —
manifest reshape, flow.js fan-out, feature dir with summary/add/delete
UX, per-record page controller, state helpers, routes registration,
i18n, CYA integration, MODEL.md generator update.

**Read this when:** you're building a new user-driven indexed group
of any size (0..N or 0..cap). It's the most involved of the four in
line count but the pattern is highly repeatable — the second time you
follow it, half the diff comes from copy-paste of the commodity-lines
sibling.

**Key commit:** [`46e6446`](https://github.com/DEFRA/trade-imports-animals-frontend/commit/46e6446)

## Meta-pattern: how each PR was structured

Every workstream followed the same file-by-file rhythm, useful as a
completion checklist:

1. **Engine** (if a new invariant kind or evaluator behaviour) —
   docstring update to enumerate all supported kinds.
2. **Manifest** (`obligations/obligations.js`) — new obligation(s) +
   any `requires` invariants. Manifest array ordered so parent
   obligations come before children.
3. **Domain** (`domain/index.js`) — one domain entry per obligation +
   register in the `[[id, domain]]` map. Or add to `KNOWN_UNWIRED`
   with a reason.
4. **Flow** (`flow/flow.js`) — page presenting the obligation(s).
5. **Feature dir** (if bespoke UX) — controller + template + tests.
6. **State** (`lib/state.js`) — add/delete helpers + counter yar key
   (records-shape groups only).
7. **Routes** (`routes.js`) — new routes + dispatch branch (records-
   shape groups only).
8. **i18n** (`locales/en.json`) — page titles + legends + hints + error
   copy.
9. **CYA** (`features/check-your-answers/controller.js`) — prompt
   routing for any new invariant error code.
10. **Tests** — engine tests for new invariant primitives; evaluator
    tests for the manifest change; integration test walking the
    golden path.
11. **MODEL.md** — regenerate via `npm run docs:model`; possibly
    extend the generator caption or edge rendering.
12. **Handover** (`EUDPA-288-HANDOVER.md`) — tick off the workstream
    with a summary + cross-refs to related open items.

Each `PLAN-*.md` was written before the code, reviewed, then executed.
That gate made the code changes small and independently reviewable.
For the next workstream, start with a plan file at the spike root.
