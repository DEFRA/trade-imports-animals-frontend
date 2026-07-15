# L3 adversarial verification — ST-1 (status-tasklist)

**Verdict: AMENDED.** The observation is real and the quotes are accurate, but the
claim is overstated on three counts: (a) "cannot express" conflates *not built*
with *cannot be built* — A already has the predicate machinery and the answers at
both mandate read sites; (b) `wipeOnExit` is an orthogonal opt-in flag, so value
destruction is an authoring choice on that one field, not a structural
consequence; (c) `activatedBy` **does** suppress mandate (scope-off ⇒ not-owed),
so A's real gap is the missing *middle* branch (in-scope-and-optional), not
answers-dependent mandate as such.

## 1. The cited quotes are real and mean what the claim says

- `engine/status.js:23-24` — `const isRequiredObligation = (obligation) =>
  Boolean(obligation?.required || obligation?.requiredAtLeastOne)`. Truthiness
  only; the obligation is not called and no answers are passed. A predicate
  function placed in `required` **would** be truthy always. Confirmed.
- `engine/status.js:28-34` — `partRequired(part)` takes no `answers` argument.
- `engine/evaluate/complete.js:54` — `return !subObligation.required ||
  isAnswered(entry?.[subObligation.id])`. Same truthiness read. Confirmed.
- `features/origin/obligations.js:12-17` — `regionOfOriginCode` is
  `required: true` + `activatedBy: { obligation: regionOfOriginCodeRequirement,
  equals: 'yes' }` + `wipeOnExit: true`. Confirmed verbatim.
- B's side checks out too: `obligations/obligations.js:190-198` is the
  `branchedGate(... {inScope:true,status:'mandatory'} / {inScope:true,status:'optional'})`
  quoted, with a comment at :186-189 explicitly naming it the "Retain-value
  pattern"; `engine/index.js:291-297` is `effectiveStatus`; `engine/index.js:392-394`
  is the classifier filtering `mandatoryInScope` by `effectiveStatus(...) === 'mandatory'`.
  So B genuinely evaluates mandate per-answers and the tag follows.

## 2. Counter-example hunt in A — what I searched

- `grep -rn "required" .../engine` → `obligation.required` is read in **exactly two
  places in the whole tree**: `engine/status.js:24` and
  `engine/evaluate/complete.js:54`. (Every other hit is `requiredAtLeastOne` /
  `requiredOneOf` / tests.) No `requiredWhen`, `requiredIf`, `mandateWhen`, no
  function-valued mandate anywhere.
- `grep -rln "inScope"` → the only producer is `engine/evaluate/reconcile.js:6-30`,
  and it is driven **solely** by `obligation.activatedBy` + collection-ancestor
  scope. `statusOf` (status.js:59-60) filters parts by that set. So scope is the
  only answers-dependent input the status engine has. No second lever found.
- Validation layer (`lib/validate/*`, hand-authored Joi per page): **no**
  conditional helper exists (`validators.js` has no `when`/`alternatives`), and
  `features/origin/controller.js:26-49` does not require `regionOfOriginCode` at
  all. So the claim is not being rebutted by a hidden page-level mandate today.
- `enforcedAt` is **not** a mandate lever — `flow/prerequisites.js:11` uses it for
  flow sequencing (which earlier steps must be answered), per `docs/flow-and-gates.md:33-35`.
- `obligation-purity.js` only constrains *imports* from `features/*/obligations.js`;
  it does not forbid richer data in an obligation. So the model does not
  structurally ban a predicate-valued mandate — the engine simply doesn't read one.

Conclusion of the hunt: **there is no mechanism in A today that expresses
"in scope + optional on the no-branch, mandatory on the yes-branch".** The claim's
central observation survives. What does not survive is "cannot".

## 3. Where the claim overreaches

### (a) "cannot" vs "has not" — the retrofit is ~10 lines, not a rebuild
A already has, as **data**, exactly the thing B uses as a **function**:
`activatedBy: { obligation, equals|includes|notInUnionOf|present, frame }`,
evaluated by `engine/evaluate/predicate.js:12-69` (`applyPredicate` / `evalPredicate`,
frame-aware for collections and enclosing frames). And the answers are already in
hand at both mandate read sites:
- `statusOf(parts, answers, inScope)` (status.js:59) — `answers` is in lexical
  scope at line 63 where `partRequired` is applied; `partRequired` just doesn't
  take it.
- `entryComplete(obligation, entry, ctx)` (complete.js:5-10) — `entry` and
  `ctx.answers` / `ctx.frames` are already threaded, and lines 24-42 already call
  `applyPredicate` / `evalPredicate` on `activatedBy` in that same loop.

A `requiredWhen: { obligation, equals: 'yes' }` slot re-using `evalPredicate`
would be a local change to those two functions plus `partRequired`'s signature —
and `obligation.required` has **no other reader in the entire codebase** (grep of
`flow/`, `shared/`, `services/`, `lib/` returns only Joi's own `.required()`).
That is a config-slot gap, not a structural limitation. Calling it structural
mistakes "the build loop never needed it" for "the model forbids it".

### (b) `wipeOnExit` is orthogonal and opt-in
`engine/evaluate/reconcile.js:32-39` computes `wiped` from
`obligation.wipeOnExit && !inScope.has(...) && isAnswered(...)`. Out-of-scope
values **survive** unless the author opts in. So "A's answer to the requirement is
to delete the field and destroy the value" is true of `features/origin/obligations.js:16`
as authored, but it is a one-line authoring choice, not something A's model forces.
(In fairness: every `activatedBy` obligation A ships — origin, transport:24/36/46,
import-purpose, cph-number, commodities — does pair with `wipeOnExit`, so it is
the settled house style; and even without the wipe the field is still out of
scope, i.e. not rendered and invisible to `statusOf`, so the *user-facing* "you MAY
give one" half is still not delivered.)

### (c) `activatedBy` does gate mandate, not merely scope
`complete.js:24-42`: for a sub-obligation whose `activatedBy` predicate is false,
`entryComplete` `return true` — i.e. a `required: true` field that is out of scope
is **not owed**. And `statusOf` drops out-of-scope parts from `required` at
status.js:60-63, so the section tag flips (e.g. FULFILLED vs NOT_STARTED) as
answers change scope. A therefore *does* have an answers-dependent mandate in the
weak sense: **mandatory-if-X, absent-otherwise**. What it lacks is the third
state — **optional-and-still-askable-otherwise**. That is the precise, defensible
gap, and it is narrower (and more actionable) than "A cannot express
answers-dependent mandate".

## 4. What is genuinely true, and worth carrying to the shopping list

A's mandate slot is a static boolean while its scope slot is a predicate; B's
`applyTo` returns `{ inScope, status }` **together** from one answers-fed function,
so scope and mandate are independently and dynamically settable. A's obligation
model can express {out-of-scope} | {in-scope, mandatory} | {in-scope, optional},
but only the *scope* half of that lattice can vary with answers — so the tri-state
"mandatory ↔ optional, both in scope" is unreachable **as built**, and A's shipped
answer to the region-code requirement is to remove the field and wipe the value.
B's shape is the better one and is what a third option should take. But the cost
of moving A to it is small (one new predicate-valued slot, two read sites, reusing
`evalPredicate`), not a rewrite — so this is a design-quality point, not a
structural blocker, and the retrofit column should say "low".
