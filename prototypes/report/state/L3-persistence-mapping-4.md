# L3 — Adversarial verification — persistence-mapping — PM-4

**CLAIM:** B has no lifecycle envelope in the model — but this is NOT a structural gap, it is a
cheap additive retrofit, and must not be counted as one. (Therefore: "sketched only" in the
comparison table, NOT in `aOnly`.)

**VERDICT: AMENDED** — the central assertion survives, and I found a *stronger* reason for it than
the claim gives. But the claim is imprecise in two places: it understates the retrofit on B, and
overstates the freeze symmetry on A.

---

## 1. Every cited fact is real (verified line by line)

### Side B
| Cited | Verified |
|---|---|
| `engine/index.js:583-584` — `journeyState(flow, state, submitted = false)`, `if (submitted) return STATUSES.SUBMITTED` | **TRUE** |
| All prod call sites pass no flag | **TRUE.** `grep -rn "statusOfJourney"` → exactly 3 prod sites: `features/check-your-answers/controller.js:342`, `features/hub/controller.js:121`, `dump.js:94`. All call `statusOfJourney(state)`. |
| Only a test passes `true` | **TRUE.** `grep -rn "submitted\|SUBMITTED"` across the whole B tree: the only `true` is `engine/index.test.js:578`. |
| No submit route | **TRUE.** `routes.js:59-132` — GET `/start`, GET `/task-list`, GET `/check-your-answers`, POST `/reset`, `/lines*`, `/lines/{lineId}/units*`. No POST `/check-your-answers`, no `/submit`, no `/confirmation`. |
| CYA terminal state is prose, not a form | **TRUE.** `template.njk:34` renders `{{ submitReadyText }}`; `locales/en.json:489` = *"…In a real service, this is where the user would submit."* |
| `obligations.md` sketches the envelope | **TRUE** (and B frames it honestly as a *"Sketch of"*, per L1-B §1.8). |

### Side A
| Cited | Verified |
|---|---|
| `engine/persistence/records.js:1-2` — `IN_PROGRESS`/`SUBMITTED` | **TRUE** |
| `services/persistence/records/stub.js:18-24` — `assertWritable` throws on SUBMITTED | **TRUE** |
| `real.js:117-119` — independent re-check, throws | **TRUE** |
| `stub.js:80-89` — `amend` throws on non-submitted | **TRUE — but stub only.** See §4. |
| `engine/journey.js:97-104` — `amendJourney` unfreezes via `records.amend` | **TRUE** |

Nothing in the claim's evidence is fabricated or misread.

---

## 2. Counter-example hunt — I tried four ways to make this a STRUCTURAL gap, and all four failed

The claim asserts a *negative* ("not structural"). To refute it I had to find something in B's
architecture that **fights** a lifecycle envelope. I hunted specifically:

**(a) Freeze-vs-self-heal write collision — my strongest hypothesis, and it is DEAD.**
B's doctrine is tolerate-and-amend: the evaluator drops unknown ids and purges out-of-scope
values, and `obligations.md:461-465` says *"the orchestrator persists the amended set"*. If that
were true, **every GET would write** — which would collide head-on with `obligations.md:2146-2147`
("Storage layer must block writes to documents with `status: submitted`"). A read that writes
cannot coexist with a write-block. That would have been a genuine structural tension.

**It isn't there.** `lib/state.js:42-44`: `readState` = `evaluateState(readFulfilments(request))` —
**pure read, no write-back**. I grepped every `evaluateState` and `writeFulfilments` call site: no
GET path writes. And `writeAnswer` (`state.js:51`) re-reads the **raw** fulfilments, not the
evaluator's amended set — so the purge is in-memory only and never persisted at all. No collision.
The freeze retrofit is clean on the read path. *(Side note, out of scope for PM-4: this means
L1-B §1.4's "the orchestrator persists the amended set" describes the doc, not the code.)*

**(b) Nowhere to hang the state.** False. `state.js:13-16` already has **three sibling yar keys**
(`SESSION_KEY`, `NEXT_LINE_ID_KEY`, `NEXT_UNIT_ID_BY_LINE_KEY`). B's state layer *already* carries
non-fulfilment state alongside the fulfilments map, and `resetState:228-232` already clears
siblings. A fourth key is trivially additive. The L1-B phrasing "the fulfilments map has exactly
one axis, so there is no place to hang status" is true **of the map** but misleading **of the
layer**.

**(c) No seam to enforce a write-block.** False — and B is arguably *better* placed than A here.
`state.js:7-8` states the invariant: *"All reads/writes go through this module; the controller
never touches `request.yar` directly."* Verified: only `page-controller.js:90`,
`line-page-controller.js:126`, `unit-page-controller.js:162` write, all via `writeAnswer`. That is
**one chokepoint**. A's freeze, by contrast, is duplicated in **two independent adapter
implementations** (`stub.js:18-24` and `real.js:117-119` — the same rule written twice, which is a
drift risk, and `real.js` re-derives status via `mapStatus` to do it).

**(d) The engine can't represent it.** False — and the opposite is true. The lifecycle seam is
**already cut, and the presentation half is already built and tested**:
- `engine/index.js:280` — `SUBMITTED: 'submitted'` is in the status alphabet.
- `engine/index.js:583` / `contract.js:91` — both `journeyState` and `statusOfJourney` **already
  accept the flag**.
- `features/hub/controller.js:31` — `[STATUSES.SUBMITTED]: 'govuk-tag--green'`.
- `features/hub/controller.js:40` — `[STATUSES.SUBMITTED]: 'hub.status.submitted'`.
- `locales/en.json:475` — `"submitted": "Submitted"`.
- `i18n-coverage.test.js:48` — the key is whitelisted, so the copy is gated against rot.

The tag, the colour, the copy and the i18n gate all exist. **Only the write half and the route are
missing.** This is unbuilt plumbing behind a finished façade — the textbook definition of
"not built" rather than "cannot be built".

**Conclusion: no structural obstacle found.** The claim's central assertion holds.

---

## 3. AMENDMENT 1 — the claim UNDERSTATES the retrofit: B has no journey document *at all*

This is the one place the claim is materially loose. "Cheap additive retrofit" implies adding a
`status` field to an existing envelope. **There is no envelope.**

```
grep -rn "journeyId\|referenceNumber\|reference-number" <B tree> --include="*.js"
→ ZERO HITS
```

B has **no journey identity, no journey document, no record concept, no per-user index, no
multi-journey list**. The fulfilments map is anonymous session state under one fixed key
(`'prototype:eudpa-249:fulfilments'`). A `status: 'submitted'` field on nothing is meaningless.

What A actually has, that a lifecycle needs to attach to, is the whole **records port** — 8 methods
(`create/load/list/has/saveAnswers/finalise/amend/clear`, `engine/persistence/records.js:8-17`),
a minted reference number (`stub.js:6-13`, `GBN-AG-yy-XXXXXX`), a `byUser` index (`stub.js:16,44`),
and `session.knownJourneyIds` authorisation (`engine/journey.js:85-88`). The lifecycle fields
(`status`, `submittedAt`) are *two lines inside that structure* (`stub.js:38,40`).

So the honest retrofit for B is: **invent the journey document (identity + minting + per-user
index + a store with a lifecycle), then hang status/submittedAt on it, then add the submit route
and the write-guard.** That is still additive and still not structural — but it is a *layer*, not
a field. "Cheap" is the wrong word; "additive, but a layer not a field" is right.

---

## 4. AMENDMENT 2 — the claim OVERSTATES A's freeze symmetry

"enforces freeze at the store **in both adapters**" — **true for `saveAnswers`**: `stub.js:18-24`
(`assertWritable`) and `real.js:117-119` (independent re-check) both throw.

"with **amend as the sanctioned unfreeze that throws on a non-submitted record**" — **true in the
STUB ONLY.** `stub.js:83-85` throws `"is not submitted — cannot amend"`. But `real.js:143-149`:

```js
async amend(journeyId) {
  const response = await fetch(`${notificationsUrl}/${journeyId}/amend`, { method: 'POST', ... })
  if (!response.ok) throw failed('amend notification', response)
```

No status check. The real adapter **delegates the guard to the Java backend**. That is arguably the
correct place for it, but it means the invariant is enforced by two different mechanisms in the two
adapters and is not pinned in A's own code for the real path. Precision matters here because this
row is being used to argue A is ahead.

---

## 5. The finding that actually decides PM-4 (and the claim doesn't make it)

**A's lifecycle envelope is not in A's obligations model either.**

A's obligation record is `{ id, required, collection, item, activatedBy, wipeOnExit, … }` — the
11-key vocabulary (per L2 §2). **No lifecycle key. No status. No submittedAt.** A's lifecycle lives
entirely in `engine/persistence/records.js` (a persistence *port*) and its two adapters — a layer
**B never built and never claimed** (`RECOMMENDATION.md:178`'s out-of-scope list).

So the L2 table row "Lifecycle envelope | A: yes | B: sketched only" is **not comparing two
obligations models**. It is comparing A's persistence layer against B's absence of one. It is a
*built-vs-not-built* gap wearing a *model-gap* costume — which is precisely the disqualified
"A has more features" reasoning that L2 §1 rules out of scope on this dimension.

This is a **stronger** justification for the claim's conclusion than the claim itself offers. The
reason lifecycle stays out of `aOnly` is not merely "B's model would take it fine" — it is that
**neither model expresses lifecycle**, so there is no model asymmetry to record.

Contrast with the genuine structural item on this dimension, the **file/document value kind**
(L2 §3.2): that one collides with B's evaluator *purity* (a virus-scan status mutates between
requests with no user input, breaking `fulfilments = user answers`). Lifecycle has no such
collision — status is set by a user action, at one chokepoint, and is read-only to the evaluator.
The two are not comparable, and only the file kind belongs in `aOnly`.

---

## 6. What I searched

- `grep -rn "submitted\|SUBMITTED"` over all B `.js`/`.njk`/`.json` — 37 hits, all reviewed.
- `grep -rn "statusOfJourney"` — 3 prod call sites + tests. All pass no flag.
- `grep -rn "journeyId\|referenceNumber"` over B — **zero hits** (the §3 finding).
- `grep -rn "writeFulfilments\|readFulfilments\|writeAnswer\|resetState"` — every write seam in B.
- `grep -rn "evaluateState"` — every evaluation call site, to test the write-on-read hypothesis.
- Full read: `lib/state.js` (232 LOC), `services/persistence/records/stub.js` (95 LOC),
  `engine/persistence/records.js` (48 LOC), `real.js:95-149`, `engine/journey.js:85-104`,
  `routes.js:50-160`, `features/hub/controller.js:24-43`.

---

## 7. Bottom line

Keep the claim's conclusion — **lifecycle does not belong in `aOnly`** — but for the stronger
reason in §5, and with the retrofit honestly sized (§3) and A's freeze honestly described (§4).
