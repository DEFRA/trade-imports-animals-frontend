# L1 — Persistence, mapping, upload, amend-after-submit — SIDE B (flow-layer)

## Headline: this dimension is very nearly ABSENT on Side B.

Stated plainly, so no one has to read further to get the truth:

- **Persistence to a durable store: none.** `@hapi/yar` session only.
- **Backend notification mapping: none.** Zero lines. No mapper, no DTO, no serialiser.
- **Parity harness against the legacy skeleton: none.**
- **File upload / cdp-uploader / virus scan: none.** Zero lines.
- **Submit: none.** There is no submit route and no submit button.
- **Freeze-on-submit: none. Amend-and-resubmit: none.**

Quantified: **232 LOC** (`lib/state.js`) out of **25,950 LOC** in the live spike — **0.9%** — is the entire
persistence surface. `0` LOC of mapping, `0` of upload, `0` of submit.

`grep -rln "cdp-uploader|uploader|virus|multipart|s3|S3"` across both Side B roots returns **no files**.
`grep "backend|schema|dto|serialise|toJSON"` across `obligations.js`, `domain/index.js`, `contract.js`
returns **no substantive hit** — the only matches for "payload" refer to the inbound HTTP form POST
(`contract.js:224 validatePagePayload`), never a backend notification payload.

This is not a criticism dressed as a finding — Side B never claimed this ground. `RECOMMENDATION.md:178`
"Out of scope — natural follow-ons" doesn't even *list* persistence, submit or upload; they are outside
the spike's frame entirely. The spike is a model argument, and the model is where its value is. The
rest of this document therefore spends its effort on the question that actually matters for the
third-option shopping list:

> **Does B's model make persistence/mapping easier or harder to retrofit than A's?**

The answer is genuinely two-sided, and it is the real deliverable here.

---

## 1. What actually exists

### 1.1 Session-only persistence (`lib/state.js`, 232 LOC) — HANDLED IMPERATIVELY

The whole story. Thin wrappers over `request.yar`. Its own header says so:

```js
/**
 * State — thin wrappers over @hapi/yar session storage.
 */
export const SESSION_KEY = 'prototype:eudpa-249:fulfilments'
```
(`lib/state.js:1-13`)

`readFulfilments` (:26), `writeFulfilments` (:30), `writeAnswer` (:50), `resetState` (:228). There is no
network call, no database driver, no async function anywhere in the file — every function is
synchronous, which is itself proof there is no I/O.

**This is a clean seam, not a tangle.** The module comment enforces it: *"All reads/writes go through
this module; the controller never touches `request.yar` directly."* (`lib/state.js:7-8`). Swapping yar
for a repository is a single-file change plus making ~6 functions async. That is the cheapest possible
retrofit shape, and it is a real (if modest) asset.

### 1.2 The persisted shape IS the model's fulfilments map — MODELLED DECLARATIVELY

The stored document is a **flat map keyed by obligation UUID**, with indexed groups using
composite `/`-delimited keys:

```
{ '<uuid-of-commodityCode>': { 'line1': '0102' },
  '<uuid-of-earTag>':        { 'line1/unit1': 'UK123' },
  '<uuid-of-countryOfOrigin>': 'FR' }
```

Written by `state.js:64-74` (`fulfilments[obligation.id] = value`, or `stored[path] = value` for indexed).
Delimiter pinned to the evaluator's at `state.js:20`.

### 1.3 Recompute-on-load — MODELLED DECLARATIVELY, and genuinely implemented

`obligations.md:1978-1986` states only the fulfilments map is persisted and **all** derived state
(statuses, navigation, journey state) is recomputed on load. Unlike the submit lifecycle below, this
one is *real*: `contract.js:50 evaluateState(fulfilments)` is called fresh per request, and nothing
derived is ever written to the session. Verified — `state.js` writes only fulfilments and two id counters.

This is a genuine persistence virtue: **there is no derived state to migrate.** It sidesteps the entire
class of "stored status went stale against the new model" bugs.

### 1.4 Tolerate-and-amend + scope-exit purge — MODELLED DECLARATIVELY. **The strongest asset here.**

The evaluator's 7-step pipeline opens by **dropping unknown obligation ids** (`evaluator.js:24`, `:61`)
and later **purges out-of-scope stored values** (`evaluator.js:253-268`). `obligations.md:461-465`:

> *"We can amend the obligation model and deploy… passes through the rest, and returns the amended
> set as part of its output. The orchestrator persists the amended set."*

This is a **schema-migration story built into the model**. A persisted document from an older model
version is self-healing on load: obligations you deleted vanish, obligations that went out of scope
have their values purged. Most hand-rolled persistence layers need an explicit migration script for
exactly this. Side B gets it free because the evaluator is total over arbitrary input.

**Caveat, stated by the spike against itself** (`obligations.md:675-676`): there is *no warn or log*
when a fulfilment is dropped — neither for scope-exit purge nor tolerate-and-amend. Silent data loss.
For a session-scoped prototype that is fine; against a durable store it is a defect that must be
closed before it ever touches real user data.

### 1.5 Id-minting and delete-cascade — HANDLED IMPERATIVELY, but carefully

Monotonic id counters live in **separate yar keys** (`NEXT_LINE_ID_KEY`, `NEXT_UNIT_ID_BY_LINE_KEY`)
specifically so a delete cannot recycle an id and silently rehydrate orphaned state
(`state.js:84-95`). `deleteCommodityLine` (:120-162) cascades: it purges every fulfilment whose
composite key starts with `${lineId}/`. The reasoning is written down at `state.js:134-138`.

This is thoughtful, and it is exactly the referential-integrity problem any real persistence layer
inherits. It is worth stealing as *reasoning* even though the code is session-specific.

### 1.6 `dump.js` name→id resolver — the only translation layer in Side B

```js
const ALL_OBLIGATIONS_BY_NAME = new Map(v4Obligations.map((o) => [o.name, o]))
function resolveFulfilments(named) { … out[obligation.id] = value … }
```
(`dump.js:40-52`)

Fixtures (`fixtures/*.json`) are authored keyed by **human name** (`"countryOfOrigin": "FR"`), while the
runtime keys by **UUID**. I chased this as a suspected defect; it is not one — `dump.js` translates at
the boundary and throws on an unknown name (:47).

But note what this is: **11 lines, unidirectional (name→id), living in a debug tool.** It is the
*shadow* of the mapper Side B does not have — proof that the moment you want to talk to anything
outside the model, you immediately need a translation table.

### 1.7 The SUBMITTED status — PARTIAL, and effectively dead code

This is the one place doc and code genuinely diverge in a way a reader could be misled by.

`STATUSES.SUBMITTED` exists in the engine's alphabet and `journeyState` accepts a flag:

```js
export function journeyState(flow, state, submitted = false) {
  if (submitted) return STATUSES.SUBMITTED
```
(`engine/index.js:583-584`; surfaced through `contract.js:91 statusOfJourney(state, submitted = false)`)

**Nothing ever passes `true`.** I checked every call site:
- `features/check-your-answers/controller.js:342` → `statusOfJourney(state)`
- `features/hub/controller.js:121` → `statusOfJourney(state)`
- `dump.js:94` → `statusOfJourney(state)`

The only caller that passes `true` is a unit test on a **synthetic** flow (`engine/index.test.js:578`).
There is no writer of a submitted flag, nowhere to store it (`state.js` has no such key), and no route
to set it — the hand-declared routes are `/start`, `/task-list`, `/check-your-answers`, `/reset`,
`/lines*`, `/lines/{lineId}/units*` (`routes.js:59-132`). **There is no POST /check-your-answers, no
/submit, no /confirmation.**

The CYA terminal state renders a *paragraph of prose*, not a form:

```njk
{% if journeyState == 'fulfilled' %}
  <p class="govuk-body">{{ submitReadyText }}</p>
{% endif %}
```
(`features/check-your-answers/template.njk:33-35`)

and the copy is the honest confession:

> `"submitReady": "All required obligations are fulfilled. In a real service, this is where the user would submit."`
> (`locales/en.json:489`)

**Verdict:** SUBMITTED is a reserved slot in the status alphabet, not a lifecycle. Cheap to close
(false limitation) — but do not let its presence in the enum, or in `obligations.md`, read as a
built capability.

### 1.8 The documented-but-unbuilt persistence design

`obligations.md` §Persistence and §Submit lifecycle describe a full lifecycle: a persisted journey
document with `status: "in-progress" | "submitted"`, `submittedAt`, and —

> *"**Fulfilments become immutable.** Storage layer must block writes to documents with
> `status: "submitted"`."* (`obligations.md:2146-2147`)

**To be fair to Side B: the docs do not lie.** They are carefully framed as design intent — the document
is introduced as a *"Sketch of the persisted Journey document"* (`obligations.md:1988`), the data-store
choice is flagged as an open decision (*"the persistence layer can't meaningfully start until it's
resolved"*, `:2130-2131`), and "Storage layer **must** block writes" is written as a requirement, not a
claim. This is documented-but-unbuilt, not doc-code contradiction. It is design capital, and it is
usable capital — but it is worth **zero** working code.

### 1.9 Upload: absent, and the file is not even modelled

Side B *does* model the metadata *around* an attachment — `accompanyingDocumentType`,
`accompanyingDocumentAttachmentType`, `accompanyingDocumentReference`,
`accompanyingDocumentDateOfIssue`, all four sharing one `branchedGate` all-or-nothing gate
(`obligations.js:754-786`). It is a nicely-modelled conditional block.

But `accompanyingDocumentAttachmentType` is a **type selector**, not a file. The widget vocabulary has
no file input at all:

```js
{ type: 'radios' | 'select' | 'checkboxes' | 'date' | 'input', … }
```
(`lib/field-widgets.js:8`; the full dispatch table adds only `'address'` at `:209`)

So the *file itself* is unmodelled — there is no obligation whose value is a document, and no widget
that could render one. Adding upload means adding a **new value kind** to the model (a file reference
with scan status), not just a new widget.

---

## 2. The real question: does B's model make persistence/mapping easier or harder?

This is where the honest answer is **both**, and the split is clean and useful.

### 2.1 EASIER: the nesting structure is data, and group enumeration is free

A backend notification is a nested document — roughly
`notification → commodities[] → animals[]`. To emit that, a mapper must know (a) what nests inside
what, and (b) how to iterate the instances.

**Side B gives both declaratively.**

- The `within` chain *is* the nesting: `commodityCode.within = commodityLine` (`obligations.js:415`),
  `earTag.within = unitRecord`, `unitRecord.within = commodityLine` (`obligations.js:564-565`). A
  mapper reads the tree rather than hard-coding it.
- The evaluator **already enumerates group instances** into
  `fulfilmentIdsByObligationId` (`evaluator.js:401-418`) — precisely the iteration a mapper needs to
  build the `commodities[]` and `animals[]` arrays. That work is done and tested.
- **Address blocks are already nested composites.** An address is one obligation whose stored value is
  `{ name, addressLine1, addressLine2?, town, county?, postCode, country, telephone, email }`
  (`obligations.js:36-38`; `domain/index.js:839-849`, 9 sub-fields; `commercialTransporter` adds a
  10th at `:877-888`). That is **already the shape of a backend address DTO** — it does not need
  un-flattening. 8 address blocks × 9 sub-fields ≈ 82 of the ~113 rendered inputs are already grouped
  into backend-shaped objects.

So the *structural* half of the mapping — arguably the hard half — is largely derivable rather than
hand-written. Only **~3 structural rules** (top-level / within `commodityLine` / within `unitRecord`)
are needed to reconstruct the nesting for all 44 obligations.

### 2.2 HARDER: the naming is opaque, and there is nothing to derive it from

The other half of a mapper is *field naming*, and here Side B is actively hostile.

An obligation record is exactly `{ id, name, within?, status?, applyTo?, requires? }` — I checked all
44. **There is no field binding an obligation to a backend field, path, or schema.** Zero.

And the identity design makes this worse, deliberately:

```js
export const commodityCode = {
  id: '21f60718-192a-4d4e-8bcd-17e8f9a0b1c3',
  name: 'commodityCode',
  within: commodityLine,
  status: 'mandatory'
}
```
(`obligations.js:412-417`)

The **persisted key is the opaque UUID** (`state.js:65`, `evaluator.js:137`), and `name` is explicitly
the *renameable* half of the identity pair. So the durable key carries **no semantic information at
all**, and the human-readable name is by design not stable enough to map against.

**Consequence:** a mapper must be authored from scratch as a **44-entry UUID → backend-path table**,
hand-maintained, with nothing in the model to check it against. That is real retrofit cost, and it is
a *structural* property of the identity design, not an unbuilt feature.

**The mitigation Side B already owns:** `obligations/coverage.test.js:80-97` is a whitelist test
asserting every obligation is either wired to a domain entry or explicitly allow-listed with a written
reason. **The same pattern trivially extends to a mapper** — "every obligation is either mapped to a
backend path or explicitly allow-listed as not-transmitted". That converts the 44-entry table from a
rot risk into a gated, enforced artefact. This is the single highest-leverage idea to carry forward on
this dimension.

### 2.3 HARDER: depth is hard-coded in the browser layer

Data-driven in the model (the `within` chain is arbitrary-depth), but **hard-coded at depth 2 in the
browser layer**: three parallel page-controller factories, three `nextAfterFor*`, three
`firstUnfulfilledPageFor*`, and an identity branch at `routes.js:154` (`=== unitRecord`).

For *this dimension* the impact is contained — a mapper reads the model, not the browser layer, so
mapping itself stays depth-generic. But **amend-and-resubmit** (deep-linking a change into a
depth-2 unit page) rides the browser layer, and would inherit that hard-coding.

### 2.4 Net assessment vs Side A

- Side B's **domain shape is *not* closer to the backend schema** in the sense that matters most:
  Layer 1.25 (`domain/index.js`) models **value-legality only** — enums, predicates, composite
  address widgets. It declares no types, no wire-format cardinality, no field paths. It is not a DTO
  layer and was never meant to be.
- Side B's **structural shape *is* closer** in one real respect: nesting is declarative and group
  instances are already enumerated, and address composites are already nested objects.
- Side B's **identity shape is further away**: opaque UUID keys with no backend binding, versus a
  model whose keys can be made to carry meaning.

**Cost of adopting B's model, on this dimension specifically:** you inherit a best-in-class
schema-migration story (§1.4) and a derivable nesting structure (§2.1), and you take on the
obligation to hand-author and gate a 44-entry UUID→backend-path mapping table (§2.2) that Side A —
having actually built two mappers against a real backend and pinned them with a Mongo parity test —
already has working. Nothing in B's model *prevents* that mapper; but B provides no evidence it works,
because it has never once talked to a backend.

---

## 3. Asymmetric capability (the deliverable)

**Things A has that B structurally cannot express (as-is):**
- **A file/document value kind.** B's model has no value shape for "an uploaded file with a scan
  status". Every value is a scalar, an array, or a flat composite; the widget table has no file input
  (`field-widgets.js:8`). Adding upload is a *model extension*, not a page. This is the one place I'd
  call B structurally short — though the extension is additive, not a rewrite.
- **A lifecycle dimension.** B's fulfilments map has exactly one axis: obligation → value. There is no
  place to hang `status`/`submittedAt`/`version`, so there is nothing for a freeze to check. The
  `submitted` flag is threaded as a *function argument* (`engine/index.js:583`), never as state —
  i.e. the model has no notion of its own document's lifecycle. Retrofitting means adding an envelope
  *around* the fulfilments map (which `obligations.md:1990-2002` already sketches). Cheap, but
  currently absent by construction.

**Things B has that A should want (on this dimension):**
- **Tolerate-and-amend / scope-exit purge as a model property** (§1.4) — a persisted document
  self-heals against a changed model. Any durable store needs this; B gets it from the evaluator being
  total.
- **Recompute-on-load doctrine** (§1.3) — persist *only* answers, never derived state. Eliminates a
  whole bug class.
- **The coverage-whitelist gate** (`coverage.test.js:80-97`), extended to mapping (§2.2). Cheapest,
  highest-leverage steal on the whole dimension.
- **The reasoning in `state.js:84-95` / `:134-138`** on non-recycling ids and cascade deletes — a
  referential-integrity problem any real store inherits.

---

## 4. Evidence index

| Claim | Evidence |
|---|---|
| Persistence is yar-only, 232 LOC | `lib/state.js` (whole file; all functions sync) |
| No upload anywhere | `grep -rln "cdp-uploader\|uploader\|virus\|multipart\|s3"` → no files |
| No backend/mapper/DTO | `grep "backend\|schema\|dto\|serialise"` over obligations/domain/contract → no substantive hit |
| No submit route | `routes.js:59-132` — GET start/task-list/CYA, POST reset/lines/units only |
| Submit is prose, not a form | `features/check-your-answers/template.njk:33-35`; `locales/en.json:489` |
| SUBMITTED never set in app | `engine/index.js:583`; all 3 prod call sites pass no flag; only `engine/index.test.js:578` passes `true` |
| Persisted key is opaque UUID | `state.js:65`; `evaluator.js:137`; `obligations.js:412-417` |
| No backend binding on obligations | full read of all 44 records — shape is `{id,name,within?,status?,applyTo?}` |
| Nesting is declarative | `obligations.js:415`, `:564-565` (`within` chain) |
| Group instances already enumerated | `evaluator.js:401-418` |
| Address already a nested composite | `obligations.js:36-38`; `domain/index.js:839-849` |
| Schema migration is free | `evaluator.js:24`, `:61`, `:253-268`; `obligations.md:461-465` |
| Silent purge, no logging | `obligations.md:675-676` (spike's own admission) |
| Docs are intent, not false claims | `obligations.md:1988` ("Sketch of"), `:2130-2131` (store choice open) |
| No file widget | `lib/field-widgets.js:8`, `:209` |
