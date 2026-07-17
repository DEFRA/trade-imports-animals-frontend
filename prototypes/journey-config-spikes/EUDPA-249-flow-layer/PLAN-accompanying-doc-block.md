# Plan — accompanying-document all-or-nothing block (Option A)

Replace the `accompanyingDocumentType --> accompanyingDocumentType`
self-loop (`obligations/obligations.js:812-820`) with a first-class
container obligation carrying a group-level all-or-nothing invariant.
Motivation is captured in the MODEL.md vs V4 spec comparison and in
audit finding #15.

Locked open decisions from the planning conversation:

- **Scalar-invariant landing, not records-shape 0..1 group.** The four
  fields keep their notification-level scalar storage
  (`fulfilments[obligationId] = value`). The container is a _pure
  invariant carrier_ — no records host, no storage-shape change, no
  contract/controller/session changes. A full records-shaped 0..1
  group upgrade is possible later if a second all-or-nothing block
  ever appears.
- **New `requires` invariant kind** (`allOrNothingOfIds`) sits alongside
  the existing `anyOfIds` and `minEntries` on the same primitive
  (`engine/index.js#groupInvariantErrors`), not as a separate primitive.

## Semantics

Given `requires.allOrNothingOfIds: [id1, id2, id3, id4]`:

- `filledCount === 0` — block inactive, no error.
- `filledCount === total` — block complete, no error.
- `0 < filledCount < total` — one error
  `{ code: errorCode, groupId, groupName, missingIds: […] }`.

Uses the same `isBlankValue` predicate as the existing per-instance
check (empty string / null / undefined / empty array).

## File-by-file changes

### 1. `engine/index.js`

Extend `groupInvariantErrors` (around line 526) to handle the new
invariant. The function currently walks `records` for `anyOfIds`; for
`allOrNothingOfIds` it walks the scalar fulfilments (no records loop).
Both invariant shapes can coexist on the same group.

Also update `groupInvariantErrorsForContainer` /
`collectGroupsPresentedIn` (around line 572) to include containers
reachable via `within` from any presented obligation on the container
— the accompanying-document group has no `presentsForEach.forEachOf`
edge (it's not a records group), so the current collector would miss it.

### 2. `obligations/obligations.js`

- Add new group obligation `accompanyingDocument` (structural
  container, no `applyTo`):
  ```js
  export const accompanyingDocument = {
    id: '<new UUID>',
    name: 'accompanyingDocument',
    requires: {
      allOrNothingOfIds: [
        accompanyingDocumentType.id,
        accompanyingDocumentAttachmentType.id,
        accompanyingDocumentReference.id,
        accompanyingDocumentDateOfIssue.id
      ],
      errorCode: 'obligation.accompanyingDocument.allOrNothing'
    }
  }
  ```
- Rewrite the four accompanying-document fields:
  - Add `within: accompanyingDocument` (surfaces the container in
    MODEL.md — matches spec's "Field Block" concept).
  - Drop `applyTo: accompanyingDocumentBlockApplyTo` on all four.
  - Set `status: 'optional'` on all four — individual completeness is
    the group invariant's job now.
- Delete `accompanyingDocumentTypeIdRef` proxy and
  `accompanyingDocumentBlockApplyTo`.
- Rename `accompanyingDocumentBlockReason` →
  `accompanyingDocumentAllOrNothingReason`, reword to "block partially
  filled". (Or drop entirely if `errorCode` carries enough context.)
- Add `accompanyingDocument` to the manifest array (before the four
  fields, ~ line 900).

### 3. `flow/flow.js`

- `accompanying-documents` page (~ line 379): drop
  `mandatoryToProceed: true` from the three sibling fields.
  Required-ness is the group invariant's job; page-save no longer
  errors on partial. The check-your-answers / hub surface the
  group-invariant error instead.

### 4. Tests

- `engine/index.test.js` — new describe for `allOrNothingOfIds`
  (all-blank ⇒ 0 errors; partial ⇒ 1 error; all-filled ⇒ 0 errors).
  Mirrors the existing `anyOfIds` describe (~ line 917).
- `obligations/evaluator.test.js` — assert the four fields evaluate
  as `optional` regardless of stored values (scope-swap gone).
- `obligations/coverage.test.js` — add `accompanyingDocument` to
  `KNOWN_UNWIRED` with a "structural container" reason if the coverage
  test doesn't already exempt group obligations. (Check: `commodityLine`
  / `unitRecord` — same shape — how are they handled today?)
- `routes.test.js` — page-save no longer errors on partial submission;
  the check-your-answers layer surfaces the group-invariant error.
  Update the two existing regressions accordingly.
- Delete tests that pinned the self-loop scope-swap behaviour.

### 5. Regeneration + docs

- `npm run docs:model` — MODEL.md regenerates:
  - Self-loop `accompanyingDocumentType --> accompanyingDocumentType`
    disappears.
  - New `[[accompanyingDocument]]` container appears with dotted
    `-.->` edges to the four fields (same visual grammar as
    `unitRecord -.-> passport/tattoo/…`).
- `analysis/` — audit finding #15 marked resolved.
- Tick this item off in `EUDPA-288-HANDOVER.md` (Known follow-ups / TODOs).
- Run `sonar analyze --staged` before commit; fix any BLOCKER/CRITICAL.

## Commit shape

Single commit:
`feat(EUDPA-288): accompanying-document all-or-nothing group container`

## Out of scope (deferred)

- Upgrading to a full records-shaped 0..1 group with `presentsForEach`
  wiring. Adds records-storage, evaluator projection, contract, controller,
  and CYA changes. Only worth doing if a second all-or-nothing block
  arrives.
- Cross-field validation UX (e.g. "you filled reference but not type —
  fill the rest or clear all"). The invariant surfaces a single error;
  richer UX is a follow-on.
