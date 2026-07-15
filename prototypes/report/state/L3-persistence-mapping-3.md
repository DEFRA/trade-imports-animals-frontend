# L3 — persistence-mapping — PM-3 — adversarial verification

**CLAIM:** B structurally cannot express a file/document value kind; the blocker is the
evaluator's *purity* — a virus-scan status mutates externally, so it can neither live inside
the fulfilments map (breaks the "fulfilments = user answers" invariant B depends on) nor
outside it (introduces a second state source the evaluator must merge). A sidesteps this by
keeping upload state outside the obligation model, "which is precisely why A could build it
at all". "The single hardest item in either retrofit direction."

**VERDICT: REFUTED.**

The claim's cited quotes are all real. Its *central assertion* — the purity blocker — is false,
and the asymmetry it credits to A does not exist in A's source. Both halves fail independently.

---

## 1. What the cited evidence actually shows (all verified)

| Citation | Verified? | What it really says |
|---|---|---|
| B `lib/field-widgets.js:8` | ✅ | Docblock lists `radios \| select \| checkboxes \| date \| input`. Rule array (`:68-335`) = checkboxes, radios, select, **address** (`:180-269`), date, number, text. No file rule. |
| B `lib/field-widgets.js:209` | ✅ | `type: 'address'` — the 6th widget. |
| B `obligations/obligations.js:754-786` | ✅ | Four obligations: `accompanyingDocumentType`, `…AttachmentType`, `…Reference`, `…DateOfIssue`. None is the file. |
| B `obligations/evaluator.js:24,61,253-268` | ✅ | `evaluate(fulfilments)` is a pure sync total function of the fulfilments map + manifest. |
| A `services/document-uploads/real.js` | ✅ | Real upload/scan/delete broker client. |
| A `features/documents/controller.js:269-274, :88` | ✅ | `state.appendEntry(… 'documents', {...entry, uploadId, filename})`; `scanStatusOf` short-circuits on `!entry.uploadId`. |

So the surface facts hold. Every inference drawn from them does not.

---

## 2. REFUTATION 1 — "fulfilments = user answers" is not an invariant of B. B already ships two system-populated fulfilments.

B's manifest **already declares obligations whose value is written by the system, not the user**,
and they go through the same pure evaluator:

`obligations/obligations.js:18-29` (module docblock):
```
 * System-populated fields are declared but NOT presented in the flow layer:
 *   - `poApprovedReferenceNumber` — system-minted at notification creation time.
 *   - `responsiblePersonForLoad` — consumed from gov.identity on authentication.
```
Declared at `:152` and `:163`, on the manifest at `:794-795`, and **pinned by test** —
`obligations/coverage.test.js:172-190`:
```js
describe('step 5c — system-populated V4 fields declared but not presented', () => {
  it('poApprovedReferenceNumber + responsiblePersonForLoad are on the manifest', …)
  it('both obligations are declared always-in-scope + mandatory', () => {
    expect(po.applyTo()).toEqual({ inScope: true, status: 'mandatory' })
```
One value is minted by an upstream service; the other is pulled from gov.identity at auth.
Neither is a user answer. Both sit in `fulfilments`. The invariant the claim says B's design
"depends on" **is not in B's design**.

## 3. REFUTATION 2 — B's canonical write-up designs for exactly the externally-settled case, by name, including `file`

`obligations.md:185-188` — B defines *two* obligation shapes, not one:
> **System-handled** — the runtime satisfies them on the user's behalf via a **callback
> pattern**. Sub-journey receipts and external API lookups are both of this shape. Not rendered
> (**or only rendered as a "checking…" state**).

A "checking…" state settled by an external callback **is a virus scan**. And `obligations.md:1844-1858`
puts the file in the type space explicitly:
> | **file-upload** | If the canonical data IS the file: obligation type is `file`. … |
> | **lookup** | …the orchestrator makes the external call, awaits the response, **writes the
> result into `fulfilments`**. |
>
> The obligation's **type** becomes the only discriminant … and **the type space stays open**.

Method step 4 says: check whether the claim credits a doc the code doesn't honour. This is the
*reverse* — the doc describes a pattern the code **already ships two instances of** (§2). The doc
is honoured.

## 4. REFUTATION 3 — the purity argument is a category error

`evaluate()` never inspects a value's provenance. Values are **opaque** — the only inspection
anywhere in the pipeline is `isKeyedRecord` (`evaluator.js:517-519`, an `object && !Array` test).
Purity here means *per-call referential transparency*: same map in, same implications out. It says
nothing about **who wrote the map**.

A scan callback writing `fulfilments[x] = {…status:'COMPLETE'}` between requests is, to
`evaluate()`, **indistinguishable from a user POST between requests** — in both cases the map
changed while the evaluator wasn't running. Recompute-on-load is not *threatened* by external
mutation; external mutation is precisely the case recompute-on-load exists to absorb.

The claim conflates the **provenance of a value** with the **referential transparency of the
function that reads it**. They are unrelated.

## 5. REFUTATION 4 — "a second state source the evaluator must merge" — B already has one, and does not merge it

`lib/state.js:13-15`:
```js
export const SESSION_KEY = 'prototype:eudpa-249:fulfilments'
export const NEXT_LINE_ID_KEY = 'prototype:eudpa-249:next-line-id'
export const NEXT_UNIT_ID_BY_LINE_KEY = 'prototype:eudpa-249:next-unit-id-by-line'
```
`:84-88` — and it is a *deliberate* design choice, not an accident:
> Session-scoped counter for the next line id. **Kept in its own yar key rather than derived from
> current fulfilments** so a Delete cannot recycle the id…

B already carries journey state **outside** the fulfilments map, in separate session keys, which
the evaluator never sees and **never merges** — because it isn't obligation state. That is the
exact structural slot an `uploadId`/`filename`/scan-status handle would occupy. The claim asserts
this slot cannot exist. It exists, it is in use, and it is documented as intentional.

## 6. REFUTATION 5 — the asymmetry is not an asymmetry: **A does not model the file either**

This is the one that kills the claim outright.

`A: features/documents/obligations.js` — the **entire** file, all 32 lines, declares the same four
obligations as B:
```js
export const documents = {
  id: 'documents', collection: true,
  item: [ accompanyingDocumentType, accompanyingDocumentAttachmentType,
          accompanyingDocumentReference, accompanyingDocumentDateOfIssue ]
}
```
**None of them is the file.** A's obligation model has no file value kind — identical to B.

`grep -rln uploadId` across A's whole prototype returns exactly: `features/documents/controller.js`,
its test, `services/document-uploads/{stub,real}.js` + tests, `docs/services.md`,
`spec/conflicts.json`. It appears in **`engine/` — never. `lib/` — never. `flow/` — never. the
notification mapper — never.**

So A did not "express a file value kind". A rode `uploadId` and `filename` into
`answers.documents[]` as **undeclared keys** through a generic `state.appendEntry`
(`controller.js:269-274`) — keys invisible to A's obligation registry, scope machinery, validation
and mapper. That is a **bypass of the model, not a capability of it**. The claim credits A with a
structural property A does not have.

## 7. REFUTATION 6 — A doesn't persist the externally-mutating value at all. It recomputes it on load.

`A: features/documents/controller.js:87-106`:
```js
const scanStatusOf = async (entry, refresh) => {
  if (!entry.uploadId) return 'COMPLETE'
  try { return await documentUploads.scanStatus({ uploadId: entry.uploadId, … }) }
  catch { return 'PENDING' }
}
const withScanStatus = (documents, refresh) => Promise.all(documents.map(async (item) => ({
  ...item, scanStatus: await scanStatusOf(item.entry, refresh) })))
```
The scan status is **fetched live from the broker on every page load** and decorated onto the view
model. It is **never written to durable state**. The only durable thing is `uploadId` — a
write-once handle produced by a user action (the upload POST), i.e. exactly the kind of stable
value B's fulfilments map already holds happily (B stores composite **object** values today: the
address block, `domain/index.js:862-870`).

So the "externally-mutating value in the state bag" problem that the claim says breaks B's model
**is a problem neither side has**, because neither side stores it. B can adopt A's exact design
with **zero change to the evaluator**.

---

## 8. What survives — the residue that IS true

1. **B has no file widget, no multipart route, no uploads service.** Real, and unbuilt. But
   additive, not structural: `rules` (`field-widgets.js:68-335`) is an ordered, exported,
   first-match-wins array dispatching on `entry.type`; B's domain type set (`enum | integer |
   string | date | address`, `domain/index.js:14-17,:212`) is an open data field, and
   `obligations.md:1854-1858` says so ("the type space stays open"). B's own `NEXT.md:1058` lists
   *"New widget shapes — standard-address-block, **file-upload**, …"* as **scheduled work**. B
   knows it is unbuilt. Nothing says impossible. This is the textbook "not built ≠ cannot be
   built" failure the method warns about.
2. **A has a working upload stack and B has none.** True — and disqualified by the framing: it is
   build-loop output, and it is bolted *beside* A's model rather than expressed *in* it (§6).

## 9. The real file-handling problem — symmetric, and it isn't purity

Worth carrying to option three, because the claim looked straight past it:

**Neither model has a side-effecting purge.** When a document obligation leaves scope, B's
`purgeStorage` (`evaluator.js:333-379`) drops the entry as a pure map transform; A's
`destroyWiped` does the same. **Neither deletes the blob from the uploader.** A deletes only on
the explicit user-remove route (`controller.js:299-313`, `documentUploads.remove(entry.uploadId)`).
Scope-exit therefore **orphans the uploaded file** on *both* sides. That — a purge that must emit
an external side effect while staying a pure map transform — is the genuinely hard file item, and
it is hard for A and B equally.

## 10. Retrofit cost, honestly

**B → file support:** one domain entry (`type: 'file'`), one widget rule, one multipart route +
uploads-service client, and a handle stored either as an object-valued declared obligation
(precedent: address blocks) or in a non-fulfilment session key (precedent: `NEXT_LINE_ID_KEY`).
**Zero evaluator change.** Days, not a rewrite. It is not "the single hardest item in either
retrofit direction" — the durable-key/UUID question (PM §3.1) and the mapper-derivation gap
(PM §2) are both harder.

**A → nothing to retrofit** — but A's shipped design is the *weaker* one to carry forward:
`uploadId`/`filename` are undeclared keys, therefore invisible to any registry-driven coverage
gate and to the mapper. That is L2 §6's "silently dropped in real mode" defect in its purest form.
If option three adopts B's coverage-whitelist gate, **A's upload keys are exactly what it would
catch.**

---

## Searches run

- Read: B `lib/field-widgets.js` (full), `obligations/evaluator.js` (full), `lib/state.js` (full),
  `obligations/obligations.js:10-49,720-800`, `obligations/coverage.test.js:165-190`,
  `obligations.md:160-209,1820-1879`; A `features/documents/obligations.js` (full),
  `features/documents/controller.js:60-108,230-313`.
- `grep -rniE "upload|virus|scan|attachment|multipart|filename"` across B's whole tree → hits only
  in `NEXT.md`, `obligations.md`, `docs/add-an-obligation.md`, and the *attachment-**type***
  (file-format enum) obligation. No upload code. Confirms the unbuilt half.
- `grep -rln "uploadId"` across A's whole prototype → `features/documents/` + `services/
  document-uploads/` + docs only. **Zero hits in `engine/`, `lib/`, `flow/`, the mapper.** This is
  the finding that refutes the asymmetry.
- `grep -rn "type:" B/domain/index.js` → open type vocabulary: enum, integer, string, date,
  address, telephone, email.
- `grep -rn "poApprovedReferenceNumber|responsiblePersonForLoad"` → B manifest + coverage test.
  This is the finding that refutes the purity blocker.
