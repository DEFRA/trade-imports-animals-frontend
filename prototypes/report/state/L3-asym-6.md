# L3-asym-6 — Orthogonal retain-value-on-flip (regionOfOriginCode)

**Capability:** a field that stays in scope, keeps its answer, and flips mandatory↔optional on state.
**Claimed direction:** B-only (A absent / B declarative). Claim: A CANNOT do this without changing its model.
**Verdict: REFUTED** — the "structural" framing is wrong. A does not model it today, but closing it is a
small, in-idiom extension that reuses A's *existing* predicate interpreter and the answers already threaded
into the one read site that matters for this field. It is unbuilt, not impossible, and the claimed cost is
materially overstated.

---

## 1. What is true as-built (the half the claim gets right)

A's two conditionality axes are genuinely disjoint today:

- **Scope** is state-dependent and declarative: `activatedBy` is evaluated in `reconcile.js:22-28`
  (`evalPredicate(obligation.activatedBy, answers, frames)`). When the predicate is false the field is not
  added to `inScope` → it becomes NA (row dropped, `hub/controller.js`), and if `wipeOnExit` is set the value
  is purged (`reconcile.js:32-39`).
- **Mandate** (`required`) is a **static boolean**: `isRequiredObligation = (o) => Boolean(o?.required || o?.requiredAtLeastOne)`
  (`status.js:23-24`), read with no `answers` argument. `complete.js:54` reads `subObligation.required`
  statically for collection members.

`regionOfOriginCode` (`features/origin/obligations.js:12-17`) is `required:true` + `activatedBy:{equals:'yes'}` +
`wipeOnExit:true`. So today it is "mandatory when yes, **NA (hidden) + purged** when no" — a scope-exit, not an
in-scope mandate-flip. The ruled spec deliberately chose that reading: `spec/conflicts.json:156` — *"the
v4-model branch's retained regionCode is **not** a requirement"* — and `spec/journey-spec.json:604` pins
`wipeOnExit:true`. So the claim is also right that this V4 set does not cash B's retain capability; it argues
against it. **A cannot express in-scope mandate-flip-with-retention as it is written.**

That is where the claim's accuracy ends.

## 2. Why it is NOT structural — the cheap, in-idiom workaround

The capability needs two things: (a) the field stays in scope with its value; (b) `required` becomes
state-dependent. Both are reachable without changing A's model core.

**(a) Retention is free.** Drop `activatedBy`+`wipeOnExit` from `regionOfOriginCode`. With no `activatedBy` the
field is unconditionally in scope (`reconcile.js:22` short-circuits `!obligation.activatedBy` → always added),
so the wipe filter (`reconcile.js:32-39`, gated on `!inScope.has(...)`) never fires. Value retained by
construction. No decoupling of `wipeOnExit` from `activatedBy` is required — you simply stop using either for
this field.

**(b) State-dependent `required` reuses machinery that already exists.** Add one declarative key,
`requiredWhen: { obligation, equals }` — the **same predicate grammar `activatedBy` already uses** — and
evaluate it with the **existing** `evalPredicate`. Verified this works verbatim for exactly this field's
predicate shape: `evalPredicate({obligation: regionOfOriginCodeRequirement, equals:'yes'}, answers)` takes the
default branch (`predicate.js:64-68`), and because the referenced obligation is top-level (`siblings.includes`
is false) it reads `answers['regionOfOriginCodeRequirement']` and applies `equals`. That is the *identical* call
`reconcile.js:24` already makes for this obligation's `activatedBy` today. Zero new interpreter, and the key is
data-shaped so A's static-introspectability property is preserved (you can still `grep requiredWhen`).

**The read site already has the answers.** `regionOfOriginCode` is a top-level scalar, so its mandate is only
consulted in `status.js`: `statusOf(parts, answers, inScope)` filters `inScopeParts.filter(partRequired)`
(`status.js:63`). `answers` is already the second parameter of `statusOf`, in scope at that exact line. The
change is:

```js
const isRequiredObligation = (o, answers) =>
  Boolean((o?.required || o?.requiredAtLeastOne) &&
          (!o?.requiredWhen || evalPredicate(o.requiredWhen, answers)))
```

plus threading `answers` through `partRequired` (one call, `status.js:63`). That is it for this field.
When `regionOfOriginCodeRequirement !== 'yes'`, the part is not required → `statusOf` lands in the
`required.length === 0` branch → **OPTIONAL** (visible, value retained). When `=== 'yes'`, the part is required
→ it gates completion. Exactly the flip, exactly the retention, entirely inside A's existing status roll-up.

**Scope of the edit:** one new declarative key + ~a handful of lines in `status.js`, reusing `predicate.js`
untouched. It touches **one** obligations.js field (opt-in), not "every obligations.js"; it does **not** need a
new `statusWhen` axis, does **not** touch `complete.js` for this field (that reader is for collection members),
does **not** change the evaluator's return contract, `reconcile`, persistence, or dispatch. The claimed cost
("statusWhen axis + decouple wipeOnExit from activatedBy, touches every obligations.js, status.js, complete.js")
is overstated by an order of magnitude for the field the claim names.

## 3. Honest residue (what a third option should still note)

- Per-**collection-entry** mandate-flip-with-retention (optional on cattle lines, mandatory on horse lines)
  would *also* need the same `requiredWhen` eval added at `complete.js:54` — which already has `ctx.answers`.
  Still an extension, not a rewrite, but a second read site. The claim's field is top-level, so this does not
  apply to it; it is the same locus as B's own §6.1 record-status gap.
- `requiredWhen` slightly widens `required` from a pure static grep to a declarative predicate. But
  `activatedBy` already established that A obligations carry state-dependent declarative predicates of exactly
  this shape, so it crosses no new conceptual boundary and keeps introspectability.

## 4. Why REFUTED not CONFIRMED

The rubric puts "merely unbuilt, or a small extension" under REFUTED. I hunted both ways: there is no *existing*
mechanism (required is static — that part of the claim holds), **but** there is a concrete, named, small
extension that reuses the existing predicate interpreter and the answers already present at the read site. The
concept has a place to live in A's model (as a sibling declarative key to `activatedBy`); it was ruled out by a
*requirements* decision (c-012/c-017, `conflicts.json:156`), not shut out by the model. B is genuinely ahead
here — it ships `branchedGate` and the accompanying-doc block cashes it — but "A cannot without changing its
model" is false.

**amendedClaim (narrower, accurate):** *At notification (top-level) granularity, A does not model in-scope
mandate-flip-with-retention today — `required` is a static boolean and the field's only conditional lever
(`activatedBy`+`wipeOnExit`) does scope-exit-with-purge, per the ruled spec. But it is a ~10-LOC opt-in
extension, not a model change: add a declarative `requiredWhen:{obligation,equals}` key (same grammar as
`activatedBy`), interpret it with the existing `evalPredicate`, and read it in `status.js`'s `partRequired`,
which already receives `answers`; drop `activatedBy`/`wipeOnExit` on the field so it stays in scope and retains
its value. B remains ahead (it ships this via `branchedGate`), but the asymmetry is unbuilt, not structural.
The per-collection-entry version additionally touches `complete.js:54` — the same locus as B's §6.1 record-
status gap.*
