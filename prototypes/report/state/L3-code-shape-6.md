# L3 — Adversarial verification — code-shape — C6 (dead code)

**CLAIM:** B carries more dead code than A in absolute terms — 7,087 LOC (21% of B) is a frozen
ancestor containing a byte-identical duplicate evaluator — but **A has the more dangerous dead
code**: 18% of its model vocabulary has no carrier, including the escape hatch its own boot-time
safety assert depends on.

**VERDICT: AMENDED.** The *numbers* are almost all real and I could not break them. The **central
assertion — the comparative danger judgement — does not survive contact with the source.** A's
"dangerous" dead vocabulary turns out to be (a) previously exercised, (b) deliberately retained and
documented as dormant, (c) coherently wired through a single choke point, and (d) already demanded
by A's own spec. Meanwhile B's frozen ancestor is imported by nothing, so *its* headline hazard
("any future evaluator fix has two homes") is also inert. Neither side's dead code is a correctness
risk. The claim invents a risk gradient the code does not support.

---

## 1. What I verified and could NOT break

| Assertion | Method | Result |
|---|---|---|
| B: `model-spikes/obligations-v4-model/` = 7,087 LOC | `wc -l` on all 10 files | **TRUE** — 7,087 exactly |
| B: `evaluator.js` byte-identical across the two homes | `diff model-spikes/.../evaluator.js obligations/evaluator.js` | **TRUE** — 0-line diff, 519 LOC |
| B: two near-identical ~3,000-line `obligations.md` | `wc -l` | **TRUE** — 2,940 (frozen) vs ~3,010 (live) |
| B: dead exports with lying JSDoc | `grep -rn "pageRouteName\|findUnitPage\|findControllerForRoute"` over all of `prototypes/` | **TRUE, and stronger than claimed** — all **three** are defined and referenced *nowhere*, not even in tests. `page-controller.js:100` "used by the plugin registrar" and `unit-page-controller.js:171-173` "used by the router" are both false; `routes.js:154` inlines `page.presentsForEach.forEachOf === unitRecord` rather than calling `findUnitPage` |
| A: `system` + `renderOnly` have zero carriers | `grep -rn "system"` / `"renderOnly"` over the **whole** live-animals tree | **TRUE** — no `features/` hit for either |
| A: 2 of 11 vocabulary keys (18%) | `docs/obligation-model.md:14-28` lists exactly 11 keys; grepped the other 9 in `features/` | **TRUE** — the other 9 (`requiredOneOf` :109, `maxEntriesFrom` :110, `requiredAtLeastOne` :108/:123, `wipeOnExit` ×13, …) all carry |
| A: 5 `system` read sites, 1 `renderOnly` read site | grep | **TRUE** — `dispatch.js:58`, `kit.js:29`, `entry-guard.js:34`, `reachability.js:163`, `contract.test.js:51`. `renderOnly`'s **only** reader is a test file |
| A: `updateEntry` (`write.js:83`) zero callers | grep | **TRUE** (see §5 for why it doesn't belong on this ledger) |

So the arithmetic is sound. The interpretation is not.

---

## 2. REFUTED: "`system` … has never been exercised"

This is the load-bearing word in the claim, and it is **false**.

Git pickaxe — `git log -S "system: true" --all` — surfaces commit **`4829198`** (inc-028), whose
message says, verbatim:

> "Delete features/quote (quote-summary page, **the system `premium` obligation** + its module-local
> `coverType` present-activator stub) … Tests: **drop reconcile premium test** … **orphanedRootIds
> is now EMPTY (premium was the last stub-activated root)** — reachability.js + test updated,
> mechanism kept as a guard. **No system obligation and no present: activator carrier remain (kinds
> still supported, documented dormant).**"

`system` had a live carrier (`premium`), a reconcile test, and a role in the reachability analysis.
Its carrier was removed **because the prototype pivoted off the car-insurance domain**, not because
the mechanism failed or was never wired. "Proven, then deliberately dormant" is a completely
different animal from "never exercised".

---

## 3. REFUTED: it is not undiscovered dead code — the docs say it, precisely, unprompted

The method brief warns against "crediting a DOC the CODE does not honour". Here the check cuts the
other way. `docs/obligation-model.md:290-302`:

> - **`system`** — computed on demand, never collected or stored. **No current obligation carries
>   the flag; the only one was the car quote's `premium`, removed with the quote feature in
>   inc-028.** `kit.collectsFrom` filters `system` obligations out of every page's `collects`, and
>   the boot coverage assertion in `flow/dispatch.js` skips them — no page owns them. **The flag
>   stands ready for a future computed value.**
> - **`renderOnly`** — … **No current obligation carries the flag; the contract stands ready for one
>   that does.**

The doc states the zero-carrier fact, names the removed carrier, names the exact commit, and names
both read sites. The code honours it exactly. This is one of the few places where A's otherwise
rot-prone docs (L2 §5 rightly nails `limits.md`) are *precisely* right.

---

## 4. REFUTED: I went hunting for the danger and the code refuted me

I did not take the claim's word for "dangerous". I constructed the strongest version of the hazard
myself and tried to land it:

> **Hypothesis:** the escape hatch is only *half*-wired. `grep -rn "system"` over `engine/` returns
> **ZERO hits** — `status.js`, `evaluate/complete.js` and `evaluate/reconcile.js` have never heard of
> the flag. So a `system: true, required: true` obligation would pass the boot assert, be excluded
> from every page's `collects`, then sit permanently unsatisfied in the status roll-up and wedge the
> journey below CYA-readiness forever — silently. And A's own spec declares exactly such an
> obligation (`accompanyingDocumentAttachmentType`, `"required": true`, `"system": true`).

**That hypothesis is wrong, and the code shows why.** Status does not walk the registry — it walks
`collects`:

```js
// flow/section-status.js:5-9
export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))
export const sectionStatus = (section, answers, inScope) =>
  statusOf(sectionObligationIds(section), answers, inScope)
```

and `collects` is derived through a **single choke point** that already filters the flag:

```js
// shared/kit.js:27-30
export const collectsFrom = (obligations) =>
  obligations.filter((obligation) => !obligation.system).map((o) => o.id)
```

So a `system` obligation is structurally invisible to `statusOf` — it never enters `parts`. The
engine's silence about `system` is **correct by design, not an oversight**: the flag is enforced
once, at the `collects` boundary, and everything downstream (status, section roll-up,
`readyForCheckYourAnswers`) derives from `collects`. `reconcile()` will put it in `inScope`, but
`statusOf` filters `parts` *by* `inScope` rather than the reverse, so an in-scope obligation that is
in no page's parts is simply never asked about.

And the boot assert's failure mode is a **loud throw naming the uncovered obligation**
(`dispatch.js:61-63`). There is no silent-wrong-answer path through `system` anywhere in A.

**I tried to find A's dangerous dead code and it isn't there.**

---

## 5. The claim conflates "not built" with "cannot be built" — and gets the direction backwards

A's **own spec already declares three `system: true` obligations** that the JS has not yet caught up
to (`spec/journey-spec.json`):

| line | obligation | why system |
|---|---|---|
| :499 | `referenceNumber` | "System-assigned by the backend on first successful save" |
| :519 | `responsiblePersonForLoad` | "Consumed from gov identity on authentication — **not collected by any page**" |
| :1861 | `accompanyingDocumentAttachmentType` | "SOURCE FLIP (c-034 resolved): **derived by the system** from the uploaded file, not user-selected" |

The vocabulary is not a vestige nobody wanted. It is **retained because the spec needs it and the
build has not reached it**. That is the textbook not-built-vs-cannot-build conflation the brief warns
about, and the claim falls into it while purporting to punish A for it.

Similarly `updateEntry` (`write.js:83-84`) is a two-line symmetry-completing wrapper:

```js
export const updateEntry = async (request, h, obligationId, index, entry) =>
  updateEntryAt(request, h, [obligationId], index, entry)
```

Its siblings are **live in production** — `appendEntry` (`documents/controller.js:269`), `removeEntry`
(`documents/controller.js:311`) — and its primitive `updateEntryAt` is live at
`consignment-details.controller.js:178` plus 6 test sites. Its callerlessness is documented at
`limits.md:56` ("no feature controller calls the update path — in the browser, collections change
through add and remove only"). Putting that on the same ledger as a 7,087-line orphaned directory is
a category error.

---

## 6. B's headline hazard is ALSO inert — the claim over-credits its own B evidence

The claim's stated danger for B is *"any future evaluator fix has two homes."* I tested it:

- **`grep -rn "model-spikes"` across the whole of B's `prototypes/` tree returns ZERO hits.** Nothing
  imports the frozen ancestor. Its 1,143-line `evaluator.test.js` tests its own local copy.
- **The pair has already drifted, harmlessly.** `diff` of the two `helpers.js` shows the *live* copy
  has added a `predicate` export plus a 6-line comment that the frozen copy lacks. Nobody noticed,
  nothing broke — because nothing consumes the frozen copy. `evaluator.js` happens to still be
  byte-identical; that is a coincidence of nobody having touched it, not a coupling.

So a fix landing in one home and not the other has **no runtime consequence**. The cost is real but
it is **confusion, review surface and repo weight** — not correctness.

## 7. The two percentages are not commensurable

- **"21% of B"** is a share of *lines of everything*. The 7,087 decomposes as **1,426 LOC of source
  JS** (`obligations.js` 698, `evaluator.js` 519, `helpers.js` 209) + **2,136 LOC of tests** +
  **3,525 lines of markdown**. The dead *code* is 1,426 — about **5× smaller** than the headline. (And
  L2 §5 itself concedes `GAPS.md` there has unique value worth keeping.)
- **"18% of A"** is a share of *vocabulary keys* (2 of 11).

Juxtaposing them as though they measure the same thing is the rhetorical move the claim rests on.

---

## What I searched

- `wc -l` over all 10 `model-spikes/obligations-v4-model/` files; `find … -name "*.js" -exec wc -l`
  over B's whole `prototypes/` (21,412 JS LOC total).
- `diff` on both `evaluator.js` (0 lines) and both `helpers.js` (6 lines).
- `grep -rn "model-spikes"` over B's `prototypes/` → 0 hits.
- `grep -rn "pageRouteName\|findUnitPage\|findControllerForRoute"` over B's `prototypes/` → 4 hits,
  all definitions/JSDoc, zero call sites.
- `grep -rn "system"` / `"renderOnly"` / `"system:"` over the whole of A's live-animals tree.
- `grep -rn "system"` over A's `engine/` → 0 hits (and §4 explains why that is correct).
- `grep -rn "requiredOneOf\|maxEntriesFrom\|requiredAtLeastOne\|wipeOnExit"` over A's `features/`.
- `grep -rn "updateEntry"` and `"appendEntry(\|removeEntry("` over A.
- `git log -S "system: true" --all` in clone-live-animals → commit 4829198.
- Read: `flow/dispatch.js`, `flow/dispatch.test.js`, `flow/section-status.js`, `engine/status.js`,
  `shared/kit.js`, `docs/obligation-model.md:14-28` + `:283-306`, `spec/journey-spec.json:486-530` +
  `:1850-1869`, `lib/page-controller.js:92-111`, `lib/unit-page-controller.js:165-179`,
  `routes.js:140-164`.

## Consequence for the L2 and the shopping list

`L2-code-shape.md` §5's table should be corrected. Its "B is worse on dead code" conclusion **stands**
(and is if anything under-stated on B's dead exports — there are three, not implied two). But the
row characterising A's `system` flag as an unexercised escape hatch, and the framing that A's dead
code is the *more dangerous*, should be struck. **Deleting B's frozen ancestor remains free and
correct. Deleting A's `system`/`renderOnly` flags would be a mistake** — the spec needs all three
`system` obligations, and the mechanism is already wired and previously proven.
