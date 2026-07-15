# L3 — Adversarial verification, asymmetry #9

**Capability:** State-dependent mandate that RETAINS the value — a field always shown and always
kept, mandatory when X, optional otherwise (status axis orthogonal to scope axis).
**Claimed direction:** B-only (A absent / B modelled-declaratively).
**Claimed cost to close on A:** widen reconcile's return type to carry a derived status, branch in
complete.js, decouple wipeOnExit from activatedBy, touch all 14 feature obligations — "model-shape
change (new axis on the engine's Decision), not a feature."

## Verdict: **AMENDED** — the capability gap is real, the "structural / new-axis" cost is overstated.

---

## 1. The gap is real today (not refuted)

A has no conditional-required. `required` is a static boolean read at **exactly two** engine sites,
and neither is predicate-aware:

- `engine/evaluate/complete.js:54` — `return !subObligation.required || isAnswered(entry?.[subObligation.id])`
- `engine/status.js:23-24` (`isRequiredObligation`) → `engine/status.js:28-34` (`partRequired`, reads
  `registry.byId(part)` with **no answers argument at all**).

`grep -rn "requiredWhen|requiredIf|conditionalRequired"` over the whole prototype: **zero hits.**
`reconcile` returns `{ inScope, wiped }` (`reconcile.js:47`); the only conditional lever built is
`activatedBy` (scope) + `wipeOnExit` (destruction).

A's two ways to approximate the target both fall short of it *from the model*:

- **`activatedBy:C + required:true`, no `wipeOnExit`** → mandatory-when-C, value retained (wipe is
  opt-in, `reconcile.js:32-38`), but when **not-C the field is OUT of scope → NA**, not
  optional-in-scope. `statusOf` filters to `inScope` parts first (`status.js:60`), so an out-of-scope
  answer is uncounted and drops out of the section roll-up / CYA. It is retained in storage but not
  *shown as an offered optional answer*. This misses the "always shown, still an optional answer when
  not-X" half of the capability.
- **always in scope, `required:false`** → always shown, always optional, always kept — but "mandatory
  when C" then has nowhere to live except a hand-coded controller save-block (the imperative pressure
  valve, `docs/obligation-model.md:139-143`), i.e. not in the model.

So the model genuinely cannot state "in-scope always + required conditionally + retained." A even
disagrees with B about the live V4 `regionOfOriginCode` rule *because* of this (A gates+wipes on `no`;
B keeps it in scope, status-swapped, retained — `L2-conditionality-gating.md` C3). **Not REFUTED.**

## 2. But the cost framing is wrong — the cheap workaround exists

The claim's 4-item cost list is predicated on A having to route conditional-requiredness **through the
scope axis** (reconcile), because activatedBy is its only conditional lever. That premise is false. The
required axis is read at two dedicated sites that already have — or can trivially get — the answer/
frame context, and A already ships the exact predicate evaluator a second lever would reuse:

- `evalPredicate(activatedBy, answers, frames)` (`predicate.js:31-69`) is a pure evaluator over an
  obligation reference + answers + frames (4 operators × 3 frame modes). A `requiredWhen` key is
  structurally identical to `activatedBy` and would reuse it verbatim.
- `complete.js` **already imports and calls** `evalPredicate`/`applyPredicate` (lines 3, 24-41) and has
  `entry` + `ctx` in hand at line 54 — a per-entry `requiredWhen` is a mirror of the `activatedBy`
  handling three lines up.
- `partRequired` (`status.js:28-34`) is the only site missing context; but its sole caller `statusOf`
  (`status.js:59-63`) already receives `answers`. Threading `answers` into `partRequired` and evaluating
  a `requiredWhen` predicate is contained to **status.js**.

Hold the field **always in scope** (omit `activatedBy`) and the rest of the claim's cost evaporates:

- "widen reconcile's return type to carry status" — **unneeded**: scope axis untouched; required is
  read at the completion sites, not on reconcile's return.
- "decouple wipeOnExit from activatedBy" — **unneeded**: the field never leaves scope, so wipe
  (`reconcile.js:32-38`, out-of-scope-only) never fires; the value is retained for free.
- "touch all 14 feature obligations" — **unneeded**: `requiredWhen` is additive and backward-compatible
  (absent ⇒ the current static-boolean path). Only the obligations that need conditional-requiredness
  (e.g. `regionOfOriginCode`) carry it.

True cost: a new `requiredWhen` predicate key evaluated at the **two existing** required-read sites
(`complete.js:54`, `status.js:28-34`), reusing `predicate.js`, plus threading `answers` into
`partRequired`. Roughly a dozen LOC across the two files that already own the mandate axis — a new key
in an existing dispatch pattern, exactly the "cheap workaround ⇒ not structural" case. It is *not* a
new orthogonal axis bolted onto the engine's core `Decision`/reconcile return, and it does not touch the
scope core, the write path, or persistence.

## 3. Honest caveat kept

B still gets this **declaratively out of one Decision** (`{inScope,status}` co-derived,
`evaluator.js:453-508`), and its wipe/retain policy (`mandatoryWhen` vs `appliesWhen`) is a first-class
distinction. A's route reaches the same observable behaviour but splits the two axes across two keys
(`activatedBy` for scope, a new `requiredWhen` for status) and two files. That is a modelling-elegance
difference worth noting for the third option — but it is a small, template-following extension, not the
model-shape change the claim asserts.

## Amended claim

B expresses "always in scope, retained, optional-until-X-then-mandatory" as one co-derived Decision.
A does not have this **built** today — its `required` is a static boolean and its only conditional
lever moves the scope axis (making the field NA, not optional, when the condition is false). But A can
add it with a modest, backward-compatible extension: a `requiredWhen` predicate key reusing the existing
`predicate.js` evaluator, evaluated at the two existing `required` read sites (`complete.js:54`,
`status.js:28-34`), with the field held always-in-scope so no change to reconcile, wipeOnExit, the
Decision return type, or the other feature obligations is required. Real gap, ~a dozen LOC to close —
not a new axis on the engine's core Decision.
