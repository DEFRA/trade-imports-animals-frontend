# L3 adversarial verification — a11y-nojs-pe — claim C6

**Verdict: AMENDED.** Every load-bearing assertion in C6 survives contact with the source.
Two things are imprecise enough to matter, and one of them cuts against A.

---

## 1. Quote verification — all cited lines are real and mean what the claim says

| Citation | Verified |
|---|---|
| `features/documents/template.njk:15` | `<form method="post" enctype="multipart/form-data" novalidate>`. `govukFileUpload` at `:47-54` — plain macro, **no `javascript: true`**, no drag-and-drop, no `data-module`. YES. |
| `controller.js:341-345` | `payload: { maxBytes: MAX_PAYLOAD_BYTES, parse: true, multipart: { output: 'annotated' } }`. YES. |
| `controller.js:260` | `uploadId = await documentUploads.upload(...)`; `services/document-uploads/real.js:29-63` is a real two-leg forward (`POST /notifications/{id}/document-uploads` → `POST /document-uploads/{uploadId}/file` with `FormData`). YES. |
| `controller.js:315-332` | `isOversizeBoom` (413) + `handleOversizePayload` re-renders the page with `{ file: OVERSIZE_FILE_MESSAGE }` and a regenerated crumb, via `ext.onPreResponse` (`:346-348`). YES. |
| `template.njk:78-82` + `controller.js:33,169-173` | Refresh is an `<a href>` (`{{ refreshHref }}`), `MAX_POLLING_ATTEMPTS = 10`, `refreshHref` appends `attempt=N+1`, `timedOut` at `>= MAX`. No `<meta http-equiv="refresh">`, no timer. YES — and this is genuinely the no-JS-correct pattern (user-controlled refresh, WCAG 2.2.1-safe). |
| `features/addresses/_address-picker.njk:8-12` | Comment verbatim; search input + `govukPagination` (`:66`) + one `govukRadios` per row (`:17-27`) + native `<details>` (`:30-41`). No client JS. YES. |
| `party-picker.controller.js:34-40,108` | `resultsHref` builds `?q=&page=&selected=`; hidden `selected` field at `_address-picker.njk:75`; `post` at `:144` `payload.party || payload.selected`. YES. |
| DESIGN-DELTA.md has zero JS/a11y/PE mentions | `grep -inE "javascript\|accessib\|progressive enhancement\|no-js"` over `DESIGN-DELTA.md` → **zero hits**. YES. |
| B has no file upload / no picker | `grep -rniE "file-upload\|govukFileUpload\|type=.file.\|multipart\|govukPagination"` over B's whole spike → **3 hits, all prose**: `NEXT.md:1058`, `obligations.md:1840`, `obligations.md:1847`. `grep -rniE "search\|paginat"` over `features/`, `lib/`, `shared/` → only `Array.filter` calls. **Zero file inputs, zero multipart routes, zero pagination, zero search.** YES. |
| B's escape-hatch precedent | `routes.js:88-132` registers `linesIndexController` / `linesAddController` / `linesDeleteController` / units equivalents directly, outside the `makePageController` loop (`:150-205`). `features/commodity-lines/controller.js:15-30` imports `readState`, `addCommodityLine`, `deleteCommodityLine` from `lib/state.js` and **never touches `page-controller.js` or `contract.js`'s payload whitelist**. YES. |

## 2. Counter-hunt on "B's model does not obstruct" — tried to break it, could not

The strongest available refutation would be a B mechanism that *rejects* a file. I looked for three:

- **The payload whitelist.** `contract.js` validates payloads against in-scope descriptors — but bespoke routes bypass it entirely (proven above), and **`writeAnswer` is a public export** (`lib/state.js:50-78`) taking `{ obligation, path, value }` with `value` of any shape, including objects (`:64-74`). A bespoke `POST /documents` controller can persist `{uploadId, filename, scanStatus}` as an obligation's fulfilment value in one call. No obstruction.
- **The 4 domain shapes.** `domain/index.js` (staticEnum, computedEnum, predicate, addressBlock) only constrains what the *generic* renderer can emit. An escape-hatch page doesn't ask the domain for a widget. No obstruction.
- **`purgeStorage`.** Runs on every evaluate (`evaluator.js:94`) and drops out-of-scope fulfilments. It would orphan an uploaded blob in cdp-uploader if a document obligation left scope — but that is a cleanup bug, not an expressiveness limit, and **A has exactly the same hole** (its `wipeOnExit` wipes the entry; nothing calls `documentUploads.remove`).

The one thing I found that the claim does not mention: **`dropUnknownFulfilments`** (`evaluator.js:62, 228-234`) means B's *evaluated* state discards any session key that is not a declared obligation. A, by contrast, appends non-obligation side-car keys straight onto a collection entry — `controller.js:269-274` writes `uploadId` and `filename` alongside the four declared obligations. So in B the file reference must be modelled as (part of) an obligation value or parked in a separate `yar` key. That is **friction, not obstruction** — and arguably B's discipline is the better behaviour.

**Net: "B's model does not obstruct either" is CONFIRMED.**

## 3. Counter-hunt on "A's engine has nothing to say" — half-refuted

DESIGN-DELTA is clean and `features/documents/obligations.js` is clean: four obligations (`accompanyingDocumentType`, `…AttachmentType`, `…Reference`, `…DateOfIssue`) inside a `collection: true` group, and **no `file`, no `upload`, no `scanStatus` vocabulary anywhere**. The scan-blocking rule ("cannot continue until all documents have been scanned or removed") is hand-written controller logic (`controller.js:36-37, 278-297`), invisible to the engine — so A's hub can show the documents task complete while a scan is still PENDING. The runtime model really is uninvolved. That half stands.

**But the claim over-reaches by implying A's modelling layer is silent on this.** A's *machine-readable spec* — the artefact the whole build loop is grown from — carries the ruling explicitly:

- `spec/journey-spec.json:130` — an open question logged from the design canvas ("JavaScript in Browser?") with a recorded **spec-gate ruling**: *"Requirement is graceful degradation (works without client-side JS, progressively enhanced)"*, and it names the upload polling loop and conditional reveals as the things that turn on it.
- `spec/journey-spec.json:1365` — models the upload: *"Widget: standard govukFileUpload — NO drag-and-drop (not GDS)"*, 50MB cap, max 10 documents, virus-scan polling, REJECTED-must-be-removed-before-Continue.
- `spec/journey-spec.json:1863` — models the **source flip**: attachment type is *derived from the uploaded file*, not user-selected. And the code honours it: `accompanyingDocumentAttachmentType` is a `required: true` obligation whose value comes from `attachmentTypeFor(filename)` (`controller.js:271`). That is a genuine — if oblique — model touchpoint: hub completeness is indirectly gated on a file actually having been uploaded, because the derived obligation stays unfulfilled otherwise.

B's canonical `obligations.md` (~3,000 lines) has **zero** hits for javascript / progressive enhancement / no-JS (only two for "a11y"/"Welsh", both aspirational-check items). So on *requirement governance* the asymmetry runs the other way: A wrote the PE requirement down and ruled on it; B's excellent no-JS property is undocumented and, as L1-B says, incidental.

## 4. Counter-hunt on "strongest delivered no-JS artefacts" — a real defect in the picker, and a GET mutation

The claim praises the picker. Reading it as a no-JS user would:

- **Pagination silently loses an unsaved selection.** `govukPagination` emits `<a href>`. The hrefs are built server-side from `selectedId` (`party-picker.controller.js:58-67, 115-120`), and on a GET `selectedId` is `request.query.selected ?? committedId(answers, party)` (`:135`) — i.e. the *previously committed* choice. A radio ticked on the current page is a form control; clicking a link does not submit the form, so the tick is discarded. The code comment at `:142-143` — *"no-JS safe across pagination"* — is only true across a **search POST** or a save, not across a pagination click. Tick row 3, click "Next", come back: your tick is gone. **This is a genuine no-JS bug in the artefact the claim calls the strongest.**
- **`GET /accompanying-documents/{index}/remove` mutates state** (`controller.js:299-313, 352-357`: `documentUploads.remove` + `state.removeEntry`). B has **zero** GET-mutating routes — `routes.js:80-132`, every reset/add/delete is POST. So on the no-JS/HTTP-semantics hygiene point A is *worse* than B, inside its own flagship no-JS feature.
- **Neither flagship artefact has a no-JS test.** The only `javaScriptEnabled: false` leg in either clone is `prototypes/e2e/live-animals.spec.js:2892-2917`, and it covers the **country select autocomplete**, not the upload loop and not the picker. Both are delivered and unenforced.

## 5. What I would put in the shopping list, unchanged

Transplant A's documents feature and address picker into B **as code**, codified as B's escape-hatch page pattern (bespoke controller + bespoke template, reading scope from the evaluator, writing through `writeAnswer`). Fix the two defects on the way in: make pagination a submit button (or carry `party` in the link), and make remove a POST.
