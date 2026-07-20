# Plan — accompanying documents as a 0..10 indexed group

Upgrades the notification-level accompanying-document block landed in
WS2 (`PLAN-accompanying-doc-block.md`) to a full user-driven indexed
group. Traders can attach between 0 and 10 accompanying documents to
one notification, each with its own `type`, `attachment`, `reference`,
and `dateOfIssue`.

Spec source: conversation with the team (PO absent). The published
Confluence page 6497338582 still reads as if there is at most one
document per notification ("This section defines optional accompanying
documents at notification level. A notification can be submitted
without an accompanying document…"). The PO will update the page
later; the manifest will carry a short comment noting the divergence
so a future reader running the spec-vs-model comparison doesn't
re-derive the wrong conclusion.

Reverses the "scalar-invariant landing" locked decision in
`PLAN-accompanying-doc-block.md` — that plan explicitly flagged this
records-shape upgrade as the deferred follow-up "if a second all-or-
nothing block ever appears". Trigger arrived earlier than expected in
a different shape (max-entries cap rather than a second block), but
the same records-shape rework closes it.

## Locked decisions

1. **0 documents at submit is allowed.** No `minEntries` floor on the
   group. Matches spec's "optional" characterisation.
2. **Per-document, all four fields are mandatory-to-proceed.** Once a
   user opens a new document via `/accompanying-documents/add`, each
   of the four per-document pages carries `mandatoryToProceed: true`.
   A user cannot escape the per-document flow with a half-filled
   record. This retires the `allOrNothingOfIds` invariant on the
   container — under the records shape, "all four filled per record"
   is expressed at the field-level with `status: 'mandatory'` (like
   `passport`/`earTag` on `unitRecord`) plus the per-page
   `mandatoryToProceed`.
3. **`maxEntries: 10` enforced both at UI (grey out the Add button)
   AND at rollup.** A user might start a journey, save 10 documents,
   then a redeploy could lower the max to 9. The invariant is
   authoritative — the UI mirrors it. New `maxEntries` invariant kind
   on `groupInvariantErrors` (symmetric to `minEntries`).
4. **UI: summary-with-add/delete pattern**, paralleling
   `features/commodity-lines/`. New feature directory
   `features/accompanying-documents/` with controller / template
   mirroring the commodity-lines shape.
5. **Container-back-ref plumbing** added in WS2
   (`member.containers` + `collectGroupsPresentedIn`'s presented-
   obligation walk) becomes dead weight for this specific site — the
   group now surfaces via `presentsForEach.forEachOf` like every
   other records group. Remove the four back-refs on this container's
   members; leave the engine-side code path in place as a general-
   purpose primitive (no dependency on this site).

## Storage-shape change

Before (WS2):

```js
state.fulfilments[accompanyingDocumentType.id] = 'veterinary-health-certificate'
state.fulfilments[accompanyingDocumentAttachmentType.id] = 'pdf'
...
```

After (WS4):

```js
state.fulfilments[accompanyingDocumentType.id] = {
  doc1: 'veterinary-health-certificate',
  doc2: 'air-waybill'
}
state.fulfilments[accompanyingDocumentAttachmentType.id] = {
  doc1: 'pdf',
  doc2: 'pdf'
}
...
```

Composite-key length is 1 (single-segment `docN`) — same as
`commodityLine` records. Not nested — accompanying-documents live at
notification level.

## File-by-file changes

### 1. `engine/index.js` — add `maxEntries` invariant kind

Extend `groupInvariantErrors` (currently: `minEntries` / `anyOfIds` /
`allOrNothingOfIds` / `recordCountEquals` — five branches after this).
Semantics symmetric to `minEntries`:

```js
if (typeof maxEntries === 'number' && records.length > maxEntries) {
  errors.push({
    code: 'MAX_ENTRIES',
    groupId,
    groupName,
    errorCode: group.requires.maxEntriesErrorCode ?? errorCode,
    maxEntries,
    actual: records.length
  })
}
```

Docstring updated to enumerate all five kinds.

### 2. `obligations/obligations.js`

Transform `accompanyingDocument` from invariant-carrier container into
a user-driven indexed group:

```js
export const accompanyingDocument = {
  id: '52210b3b-4c53-4b81-8ef0-fa0b1223e40c',
  name: 'accompanyingDocument',
  // No `within` — notification-level records group. Same category
  // as `commodityLine`.
  requires: {
    // Spec (per conversation with team, 2026-07-20): "0..10 documents
    // per notification". Confluence page 6497338582 still reads as if
    // there is at most one; PO will amend later.
    maxEntries: 10,
    maxEntriesErrorCode: 'obligation.accompanyingDocument.tooMany'
  }
}
```

Rewrite the four member fields to be records within the group,
mandatory once the record exists:

```js
export const accompanyingDocumentType = {
  id: '4fdce1f7-…',
  name: 'accompanyingDocumentType',
  within: accompanyingDocument,
  status: 'mandatory'
}
// same shape for AttachmentType / Reference / DateOfIssue
```

Delete:

- `accompanyingDocumentAllOrNothingReason` (retired)
- The `member.containers` back-ref pass at the bottom of the manifest
  (targeted removal — the loop stays if we ever wire another
  invariant-carrier, or the loop can be deleted entirely if we're
  confident no future site needs it; recommend keeping the loop but
  it will now walk zero containers).

### 3. `flow/flow.js` — restructure the accompanying-documents subsection

Replace the current single `accompanying-documents` page (with four
scalar presents) with a per-document fan-out:

```js
{
  kind: 'subsection',
  id: 'accompanying-documents',
  titleKey: 'flow.subsection.accompanying-documents.title',
  children: [
    // Summary/index page — not a `page` per se; routing handled
    // by a bespoke controller (parallel to /lines).
    // Optionally include a hidden `intro` page for the "no docs
    // yet" empty state, same pattern as commodity-lines-intro.

    // Per-document pages — presentsForEach on accompanyingDocument.
    {
      page: 'accompanying-document-type',
      presentsForEach: {
        obligation: accompanyingDocumentType,
        forEachOf: accompanyingDocument,
        mandatoryToProceed: true,
        errors: { required: 'errors.accompanyingDocumentType.required' }
      }
    },
    {
      page: 'accompanying-document-attachment',
      presentsForEach: {
        obligation: accompanyingDocumentAttachmentType,
        forEachOf: accompanyingDocument,
        mandatoryToProceed: true,
        errors: {
          required: 'errors.accompanyingDocumentAttachmentType.required'
        }
      }
    },
    // reference + date-of-issue same shape
  ]
}
```

### 4. `features/accompanying-documents/` — new feature directory

Mirror `features/commodity-lines/`:

- `controller.js` — index / add / delete routes:
  - `GET  /accompanying-documents` — list existing documents with
    per-row Change + Delete, plus an Add-another button (disabled at
    `maxEntries`).
  - `POST /accompanying-documents/add` — mint a new doc via
    `addRecord` (records-port.js), redirect to
    `/accompanying-documents/{docId}/type` (first per-document page).
  - `POST /accompanying-documents/{docId}/delete` — drop the doc's
    leaves.
- `list.njk` — the summary template.
- `controller.test.js` — mirror `commodity-lines/controller.test.js`.

### 5. `services/persistence/records/records-port.js`

The existing `addCommodityLine` / `deleteCommodityLine` are commodity-
line-specific by name but functionally generic. Two options:

- **(a) Generalise** — extract `addRecord(request, groupObligation, …)`
  / `deleteRecord(request, groupObligation, id, leafObligations)` and
  reimplement `addCommodityLine` / `deleteCommodityLine` on top. Small
  refactor, opens the same primitive up to future indexed groups.
- **(b) Copy** — add `addAccompanyingDocument` / `deleteAccompanyingDocument`
  as siblings. Faster to land, cheaper to review, slight duplication.

Recommend **(a)** since we're adding the third user-driven records
group (`commodityLine`, `unitRecord`, `accompanyingDocument`) and the
generalised primitive is small.

### 6. `routes.js` — wire the new routes

- Register the new feature's routes.
- The existing depth-1 records-group route registration (each per-
  line page as `/lines/{lineId}/{page}`) has an analogue for
  accompanying-documents: `/accompanying-documents/{docId}/{page}`.
  Existing dispatcher may already handle this via the
  `presentsForEach.forEachOf === accompanyingDocument` case — check
  during implementation.

### 7. `locales/en.json`

- New page titles + legends for the four per-document pages (may be
  identical to the current single-page copy — just moved).
- `errors.accompanyingDocument.tooMany` — the maxEntries error copy.
- Summary-page copy (page title, "no documents yet", "Add another
  document", "Delete this document", "You have added N of 10").
- Retire `cya.promptAccompanyingDocumentPartial` — replaced by the
  standard per-record incompleteness surfacing (mandatoryToProceed on
  each per-doc page + records-shape rollup).

### 8. `features/check-your-answers/controller.js`

- Remove the `obligation.accompanyingDocument.allOrNothing` prompt
  branch (retired invariant).
- Add a `MAX_ENTRIES` branch — surface the too-many-documents error
  as a prompt with a link back to `/accompanying-documents`.
- Document rows now render per-record (same as commodity-lines does
  today) — the existing per-line row emission already handles
  `presentsForEach` records; verify it picks up the new group without
  changes.

### 9. Fixtures

- `fixtures/transit-with-lines.json` — currently sets the four
  accompanying-document scalars. Reshape to `{ doc1: value }` map
  form. Alternative: drop the accompanying-document fulfilments
  entirely (0 documents is now a valid submission) — cleaner.
- Any new fixture for "many-documents" case worth adding if we want
  a scenario-level test of the 10-cap.

### 10. Tests

**`engine/index.test.js`** — new describe for `maxEntries` (mirror
the `minEntries` describe). Cases:

- Empty list when records at floor
- Empty list when records under cap
- Empty list when records at cap
- One error when records exceed cap
- Composes with `minEntries` (both can co-emit)

**`obligations/evaluator.test.js`** — retire the WS2 accompanying-
document scalar tests (fields-always-optional-in-scope, retain-value
semantic). Add new tests asserting:

- Fields are `status: 'mandatory'` within the group
- Records survive round-trip
- Deleting a doc via records-port drops all four leaves for that docId

**`integration.test.js`** — walk the golden path:

- 0 documents → subsection is optional / NA
- 1 document with all 4 filled → subsection F
- 1 document with 2 fields filled → subsection IP (per-doc
  mandatoriness)
- 10 documents filled → subsection F
- 11 documents somehow (fixture-level) → maxEntries error fires

**`features/accompanying-documents/controller.test.js`** — mirror
commodity-lines tests: index empty, index with N records, add mints

- redirects, add at cap 400s, delete drops leaves.

**`e2e-walk.test.js`** — internal-market walk currently fills the
four scalar accompanying-document fields. Change to: add 1 document +
fill its four per-doc pages (same values, different URLs).

**`routes.test.js`** — the four WS2 routes.test.js regressions
around partial submission need to be rewritten for the new shape:

- Per-doc page-save on a half-filled document 400s (mandatoryToProceed)
- Per-doc page-save with the field filled 302s
- Add at maxEntries 400s (or is prevented at UI level — see decision #3)

**`analysis/reachability.test.js`** — 4 accompanying-document fields
were TRIVIAL under WS2 (no applyTo). They still are (still no
applyTo, just `within` + `status`). Classification unchanged.
Assertion counts may need +/- adjustment; run and confirm.

**`obligations/coverage.test.js`** — `accompanyingDocument` moves
from invariant-carrier-only to structural group (`within` back-refs
from four children). `KNOWN_UNWIRED` entry still valid ("no direct
value"), reason comment updated.

**`sketches.test.js`** — coverageReport `missing` set: entry stays
the same (accompanyingDocument still no domain), just recategorised
in the comment.

### 11. `flow/boot-totality.js`

The WS2 invariant-carrier exclusion (`o.requires && !o.applyTo &&
o.status === undefined && !o.within`) still holds for a records-
shape group — same predicate matches. No change needed. The
existing structural-group exclusion picks up
`accompanyingDocument` via `obligations.some(other =>
other.within === o)` — that's the primary reason it's excluded now.

### 12. Docs regeneration

- `npm run docs:model` — MODEL.md regenerates:
  - `accompanyingDocument` still `[[…]]` shape (structural), but the
    four members now show `within: accompanyingDocument` (previously
    `—`). Notes column becomes `structural` on the container.
  - Old `-.->` allOrNothing edges disappear.
  - New `-.->` maxEntries edge? Debatable — the graph today doesn't
    render `minEntries` as an edge (it's a self-invariant, not a
    cross-reference). Consistent choice: don't render `maxEntries`
    edges either.
- Update the generator's caption to enumerate all five invariant
  kinds. (Currently: any-of + all-or-nothing + record-count-equals.
  Add min-entries + max-entries for completeness; both are
  self-invariants and don't render as edges, but the caption should
  still mention them.)

### 13. Handover

Tick this off in `EUDPA-288-HANDOVER.md`. Note the spec-Confluence
divergence (page 6497338582 stale; PO to update) so the next reader
running the spec comparison doesn't re-open the same discussion.

## Commit shape

Two commits, reviewable independently:

1. `refactor(EUDPA-288): extract addRecord / deleteRecord generic primitives`
   — records-port.js generalisation only. No behaviour change; every
   commodity-lines test still passes.
2. `feat(EUDPA-288): accompanying documents as a 0..10 indexed group`
   — everything else (engine maxEntries + manifest reshape + flow +
   feature dir + tests + fixtures + i18n + MODEL.md regen).

If the records-port generalisation turns out messier than expected,
fall back to option (b) in §5 and land as a single commit.

## Out of scope (deferred)

- **File-upload UX** for the attachment. The spec still treats
  attachment-type as a plain enum (PDF, JPG, etc.); actual file
  bytes aren't in scope for the spike.
- **Per-document ordering / reordering.** Users can add and delete
  but not reorder — matches the commodity-lines pattern. If ordering
  becomes a real requirement, add a sort field later.
- **Bulk import / paste of multiple documents.** Not in scope.
- **Any change to the notification-level `Reference Number`
  minting**, which is the only other "system-populated indexed"
  concept in the spec and is out of scope for other reasons.
