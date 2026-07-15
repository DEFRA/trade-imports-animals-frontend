# L3 adversarial verification — session-state — SS-6

**Claim:** B's `dropUnknownFulfilments` (model-drift self-heal) is BLOCKED in A, not merely unbuilt:
A's answers map is an open object into which controllers write non-obligation keys, so a
drop-unknown pass would delete the uploader handles the real notification mapper depends on.

**Verdict: REFUTED.** The observation underneath is true (A's answers map is open; controllers do
write two undeclared keys). The central assertion is false on three independent grounds, and the
specific consequence asserted — "the real notification mapper depends on" `uploadId`/`filename` —
is contradicted by the mapper source.

---

## Step 1 — the quotes are real

- `obligations/evaluator.js:227-235` (B) — `dropUnknownFulfilments` is exactly as quoted: it iterates
  `Object.entries(fulfilments)` and keeps an entry iff `obligationsById.has(obligationId)`. Called
  first in `evaluate` (step 1). Real.
- `features/documents/controller.js:269-274` (A) — real:
  ```js
  await state.appendEntry(request, h, 'documents', {
    ...entry,
    accompanyingDocumentAttachmentType: attachmentTypeFor(filename),
    uploadId,
    filename
  })
  ```
- `features/documents/obligations.js:21-30` (A) — `documents` declares exactly 4 item fields
  (`accompanyingDocumentType`, `accompanyingDocumentAttachmentType`,
  `accompanyingDocumentReference`, `accompanyingDocumentDateOfIssue`). So `uploadId` and `filename`
  are genuinely undeclared. Real.
- Read-back sites are real: `controller.js:88-92` (`scanStatusOf`), `:304-306` (`getRemove`).

So the factual substrate holds. Everything after it does not.

---

## Refutation 1 — the notification mapper does NOT read `uploadId` or `filename`

This is the claim's load-bearing consequence, and it is simply false.

`grep -rn "uploadId" services/ engine/` returns hits in **`services/document-uploads/` only** — the
uploader client and its tests. **Zero hits in `services/persistence/`.** `grep -rn "uploadId|filename"
features/` returns hits in `features/documents/` only.

Both mappers, at source:

- **Mapper B** — `services/persistence/records/notification-mapper.js:406-416`:
  ```js
  const targetDocuments = (documents) => {
    if (!Array.isArray(documents) || documents.length === 0) return undefined
    return documents.map((doc) =>
      compact({
        documentType: doc.accompanyingDocumentType,
        attachmentType: doc.accompanyingDocumentAttachmentType,
        reference: doc.accompanyingDocumentReference,
        dateOfIssue: doc.accompanyingDocumentDateOfIssue
      })
    )
  }
  ```
  Four fields — all four *declared*. `uploadId`/`filename` are dropped on the floor. The reverse,
  `documentsFromTarget` (`:418-428`), rebuilds those same four and nothing else.
- **Mapper A** — `answersToNotification` does not map `documents` **at all**. Pinned by test:
  `notification-mapper.test.js:261` `expect('documents' in notification).toBe(false)`; commented at
  `real.integration.test.js:14` ("Fields with no backend home … documents … are never mapped by
  Mapper A and are expected to drop").

The mapper does not depend on the smuggled keys. It discards them.

## Refutation 2 — A ALREADY closes the key set at the persistence boundary, and survives it

This is the counter-example the claim needed to look for. In real mode A's answers map is not merely
*tolerant* of a manifest-shaped projection — **it is reconstructed by one on every request.**

`services/persistence/records/real.js`:
- `saveAnswers` (`:121-124`) writes `toNotification(answers)` — the mapper. `uploadId`/`filename`
  never reach the backend.
- `load` (`:85-93`) → `marshal` (`:44-54`) → **`answers: toAnswers(stripNulls(notification))`** — the
  answers map handed back to the engine is *rebuilt from the backend document by the reverse mapper*.

`engine/journey.js:59-71` `currentJourney` memoises only per-request (`request.app[JOURNEY_MEMO]`), so
**every new request in real mode re-derives answers via `records.load` → `toAnswers`.** The smuggled
keys are therefore already gone from request N+1 onward in real mode. (Contrast the stub adapter,
`records/stub.js:67-70`: `journey.answers = structuredClone(answers)` — verbatim, keys survive.)

And A does not break, because both read sites are deliberately null-guarded:
- `controller.js:88` — `if (!entry.uploadId) return 'COMPLETE'`
- `controller.js:304` — `if (entry?.uploadId) { … documentUploads.remove(…) }`

So the *exact* operation the claim says is blocked — "close A's answers key set over the declared
model" — is already performed by A's own real-mode persistence layer, in production, today, with a
designed graceful degrade. It is not blocked. It is shipped.

## Refutation 3 — shape mismatch: B's pass is top-level, and would not touch these keys anyway

`dropUnknownFulfilments` filters **top-level obligation-id keys** (`evaluator.js:227-235`). In B that
achieves *full* closure only because B's storage is flat — every leaf obligation is a top-level key.

A's answers map is nested: `documents` is itself a declared obligation
(`features/documents/obligations.js:22 id: 'documents'`), and `uploadId`/`filename` live *inside an
array entry*, not as top-level answers keys. A like-for-like port of B's pass to A's top level would
keep `documents` whole (it is in the manifest) and **never look at the entry's keys**. It touches
nothing.

Only a *recursive, item-field-aware* variant — which is not what `evaluator.js:227-235` does — would
reach `uploadId`/`filename`. The claim conflates the two.

---

## What is actually true (the salvage)

There is a real, much smaller finding, and it is worth keeping:

1. A's answers map is genuinely open, and two undeclared keys are written into a collection entry.
   B's shape makes the equivalent smuggling impossible-by-construction: a value can only exist under
   a top-level obligation id, so any un-modelled key is dropped by step 1.
2. Consequently the *depth* of closure differs. One top-level pass closes B's whole key set; the same
   pass closes only A's top level. To match B's guarantee, A needs a recursive item-field close — and
   *that* pass would need `uploadId`/`filename` modelled first (or an explicit "transient, not
   persisted" escape hatch in the item vocabulary).
3. The cost of not doing so is NOT mapper breakage. It is that a recursive close, applied on read in
   **stub** mode, would silently strip the in-flight uploader handles and degrade virus-scan status to
   a permanent `COMPLETE` (`controller.js:88`) and skip the remote delete on remove (`:304`) — i.e. it
   would quietly kill the scan-polling feature in stub mode, where today it works. Modest, real, and
   entirely fixable by declaring the two keys.

That is a ~2-key spec change with a contained blast radius, not a structural block. And it argues *for*
B's shape on the merits (closure by construction) without needing the false mapper-dependency story.
