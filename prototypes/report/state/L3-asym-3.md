# L3 asymmetry verification #3 — file value carrying an externally-mutating virus-scan status

**Capability:** File/document value carrying an externally-mutating virus-scan status (ITAHC upload; PENDING/COMPLETE/REJECTED; REJECTED blocks Continue) — c-034 RESOLVED, real CDP-uploader adopted.
**Claimed direction:** A-only (A: handled-imperatively / B: absent, and *structurally cannot*).
**Verdict: REFUTED.**

The "structural / A-only" framing is wrong. Neither side models the scan status inside its obligation engine — **A handles it entirely in a feature controller + service, with its own obligation engine uninvolved**, and B has the exact same controller/service seam available with its evaluator equally uninvolved. The claim's "deeper blocker" (that B's pure total evaluator over user-fulfilments must yield) does not fire, because the scan status never has to reach the evaluator on either side.

---

## 1. What A actually does — and where

A does **not** put scan status in its obligation model. It lives in a service (`services/document-uploads/`) polled live from a feature controller (`features/documents/controller.js`), rendered as a bespoke feature page, and the Continue-block is a plain controller check.

`features/documents/controller.js`:
- `scanStatusOf(entry, refresh)` (:87-96) is **async**, calls `documentUploads.scanStatus({...})` (:90) — I/O — and defaults to `'PENDING'`/`'COMPLETE'`.
- Status is **polled fresh each render** (`withScanStatus`, :100-104; `refresh` arg), never persisted as a user answer.
- The block is a controller-level guard (:283-292): `documents.some(item => item.scanStatus !== 'COMPLETE')` → emit `CANNOT_CONTINUE_MESSAGE` (:36-37) / per-file `rejectedErrors` (:156-158) into the error summary and refuse to advance.
- The UI is a `govukTable` of rows with status tags (`SCAN_STATUS_TAGS`, :117-120; `statusTagHtml`, :123; `documents.map(...)`, :148-152) — a **bespoke feature template, not a field widget**.

So on A this is imperative controller + service code sitting *outside* the obligation engine. The claim concedes this ("kept outside the obligation model, services/document-uploads, features/documents"). That concession is the whole ballgame.

## 2. Why B is not structurally barred

### 2a. The evaluator never needs to see the scan status — so its purity/totality is untouched
A's engine doesn't ingest scan status; neither would B's. The "REJECTED blocks Continue" decision is a *proceed/validation* concern, not a *scope* concern — the document obligation stays in scope when REJECTED, you just can't advance. B already routes proceed-blocking through the POST validation gate and controller guards, not through the ObligationEvaluator. So the claim's "total-evaluator-over-user-fulfilments invariant has to yield" is a non-sequitur: the evaluator is not in the loop for either side.

### 2b. B already writes system (non-user) values into the fulfilments map — the "fulfilments = user answers" doctrine is already relaxed in code
`lib/state.js:97-115` `addCommodityLine` writes `fulfilments[seedObligation.id][id] = ''` — a machine-injected placeholder, explicitly *not* a user answer ("Seed a placeholder record … so the ObligationEvaluator recognises the line as existing"). The purge step **retains in-scope values verbatim and only drops out-of-scope entries** (L1-evaluation-engine-B §2.2); it never regenerates or clobbers a value. So an externally-written status value stored against an in-scope obligation survives every recompute. The "cannot live in the fulfilments map without breaking 'fulfilments = user answers'" objection is refuted by B's own seed hack — the map already carries system-written values and the evaluator is indifferent to their provenance.

### 2c. …but B does not even need to store it in fulfilments — it can poll live exactly as A does
A's status is ephemeral (polled per render), stored in neither engine. B can do the identical thing: a `features/documents` controller polls a `services/document-uploads` service and computes the block inline. Storing it in a **side session key outside fulfilments** means the ObligationEvaluator never reads it → no "second state source to merge," because nothing merges it; the controller reads it directly, as A's controller does. The claim's "either way the pure-recompute doctrine has to yield" is false for both branches: in-fulfilments (2b, evaluator passes it through opaquely, precedent = seed hack) and out-of-fulfilments (2c, evaluator never sees it).

### 2d. "REJECTED blocks Continue" is expressible with EXISTING B hooks
Three existing seams, any one suffices:
- **POST validation gate + sibling-reading predicate.** `engine/index.js:61-102` `validate(...)` exposes `predicateCtx = { fulfilments, path, siblingValue, ids }` (:74); `siblingValue` reads another obligation's value at the same path (:66-73) — the exact pattern `speciesDomain` uses to read a line's `commodityCode`. A predicate that errors when the scan-status value is `REJECTED` blocks the POST (fieldErrors → re-render, no redirect) = blocks Continue. Existing, exercised mechanism.
- **`isComplete` domain hook.** `hasFulfilment` consults `domainEntry.isComplete` for composites (the address pattern, L1-eval-B §2.5). An `isComplete` that returns false unless `scanStatus === 'COMPLETE'` keeps the page NS/IP → never Filled → the mandatory-completion gate B already uses blocks submit.
- **Controller guard before redirect** — same shape as B's existing scope guards (`line-page-controller`) and identical to A's `features/documents` check.

### 2e. The "field-widgets union has no file input" evidence is a red herring
A does not render the upload UI through its field/widget dispatch either — it is a bespoke `govukTable` feature page (`features/documents`). B has feature pages with their own templates (`features/units`, `features/commodity-lines`) built the same way. A `features/documents` page in B would bypass `pickWidget` entirely, exactly as A's does. So the widget-union gap does not bite. (Even if one wanted a genuine file *field*, B's widget layer is an open ordered first-match table — `lib/field-widgets.js:337-343` + the 7-rule `rules` array — where adding rule 8 for a new domain `type` is the sanctioned extension pattern, not a model change.)

## 3. What is genuinely true (the narrowed, shopping-list residue)
B has **built none of this**: no `services/document-uploads`, no `features/documents`, no cdp-uploader callback route, no file widget, no client JS. That is real work — but it is the **same work A had to do, in the same layer (controller + service), outside the obligation model**. It is breadth/build-cost, not a structural-model asymmetry. The brief explicitly discounts "A has more features" as a quality signal, and this is exactly that: an unbuilt feature that lives outside both models.

For the third option this is a **layer-agnostic build item**: whichever obligation model is chosen, document-upload-with-scan-status is a feature-controller + service + poll-and-block guard sitting beside the model, not inside it. Picking B's model costs nothing extra here versus picking A's.

## 4. Evidence index
- A block-on-status, controller-level, engine-uninvolved: `clone-live-animals/.../features/documents/controller.js:36-37,87-104,117-120,148-158,283-292`; service at `services/document-uploads/{real,stub}.js`.
- B seed hack proves system-written values in fulfilments: `clone-flow-layer/.../lib/state.js:97-115`.
- B purge retains-in-scope / drops-out-of-scope, never regenerates: L1-evaluation-engine-B §2.2 (`evaluator.js:333-377`).
- B cross-field validation via siblingValue (blocks POST): `engine/index.js:61-102`.
- B `isComplete` composite-completeness hook: L1-evaluation-engine-B §2.5.
- B open widget-rule table (extension pattern): `lib/field-widgets.js:337-343` + `rules`.
- B document obligations are enum/type fields today, not files: `obligations/obligations.js:764-786` (`accompanyingDocumentAttachmentType` is an attachment *type* selector, not a file).
