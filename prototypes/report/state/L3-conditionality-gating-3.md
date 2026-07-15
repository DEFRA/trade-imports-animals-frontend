# L3 — adversarial verification — C3 (conditionality-gating)

**CLAIM:** A structurally cannot express conditional requiredness or a retained-but-status-swapped
field. `required` is a static boolean; the engine's only derived output is `inScope`/`wiped`. B can say
"always in scope, retained, optional until X then mandatory". The two sides disagree about a live V4 rule
(`regionOfOriginCode`) and **A could not have represented B's reading even if it wanted to**.

**VERDICT: AMENDED.** Two of the three assertions do not survive contact with the source.

- "A cannot express conditional requiredness" — **FALSE**. A expresses it, and `regionOfOriginCode` is
  the live carrier.
- "A cannot express retention" — **FALSE**. `wipeOnExit` is an opt-in flag; omitting it retains.
- "A could not have represented B's reading even if it wanted to" — **FALSE, and inverted**. A's own
  spec names B's branch by name, considers its reading, and *rules it out as a requirement*.
- The residual true core — A cannot hold a field **in scope** while swapping its mandate — survives,
  and matters more than the claim realises (it blocks the render half of the shopping list).

---

## 1. The cited evidence is real, but the inference from it is wrong

| cite | verified? | what it actually says |
|---|---|---|
| A `docs/obligation-model.md:19` | yes | "`required` \| mandate \| This answer is owed before the obligation counts as complete." Static, agreed. |
| A `engine/evaluate/reconcile.js:47` | yes | `return { inScope, wiped }`. Two derived outputs, agreed. |
| A `spec/journey-spec.json:600-604` | yes | `activatedBy: {regionOfOriginCodeRequirement equals Yes}`, `wipeOnExit: true`. |
| B `evaluator.js:278-293` | yes | `runApplicabilityDecisions` calls `o.applyTo(...)`; the Decision carries `{inScope,status,records,reasons}`. |
| B `obligations.js:186-198` | yes | `regionCode` = `branchedGate(req==='yes', {inScope:true,status:'mandatory'}, {inScope:true,status:'optional'})`, with the comment "V4 spec: the field itself is not purged on `no`". |
| B `obligations.js:754-786` | yes | 4 accompanying-document fields share one `branchedGate` keyed on `documentType` being filled: `{inScope:true,status:'mandatory'}` / `{inScope:true,status:'optional'}`. |

B's `status` axis is genuinely honoured, not decorative — I checked the consumers rather than trusting
`obligations.md`: `engine/index.js:294-296` (`effectiveStatus`), `contract.js:316`
(`isSufficientForProceed` returns true immediately when optional — the comment at `:305-308` cites the
exact regionCode case), `engine/index.js:393` (completeness counts mandatory entries only),
`features/check-your-answers/controller.js:110,272`. So B's capability is live. **That half of the claim
stands.**

What does not follow is the claim about A.

## 2. Counter-example 1 — A DOES express conditional requiredness. `regionOfOriginCode` IS the example

`engine/status.js:59-63`:

```js
export const statusOf = (parts, answers, inScope) => {
  const inScopeParts = parts.filter((part) => inScope.has(partKey(part)))
  if (inScopeParts.length === 0) return NA
  const required = inScopeParts.filter(partRequired)
```

Requiredness is **filtered by the derived scope set before it is applied**. So A's derived "owed" bit is
`required && inScope` — a static flag ANDed with a derived one. `features/origin/obligations.js:12-17`:

```js
export const regionOfOriginCode = {
  id: 'regionOfOriginCode',
  required: true,
  activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' },
  wipeOnExit: true
}
```

This field is owed **exactly when** `regionOfOriginCodeRequirement === 'yes'`, and not owed otherwise.
That is conditional requiredness, derived, in the model, live, today. Same in the entry-level resolver:
`complete.js:23-34` short-circuits a sub-obligation's `required` check when its `activatedBy` predicate
fails. The claim's own headline example is a working counter-example to its own headline.

Note also `engine/status.js:9,64-66`: A has an `OPTIONAL` hub status, derived when a section's in-scope
parts contain no required one. Mandatory-vs-optional is a *derived* distinction in A at section level.

## 3. Counter-example 2 — A DOES express retention. `wipeOnExit` is opt-in

`reconcile.js:32-39` filters the wipe set on `obligation.wipeOnExit &&  …`. Omit the flag and the value
is **retained** on scope exit. This is not theoretical: 15 of A's 44 obligations carry it and 29 do not,
and the docs describe it as a per-obligation relationship flag (`docs/obligation-model.md:27`,
`docs/add-a-collection.md:60`). "Gated + retained" is one keystroke away.

So B's regionCode semantics decompose into two things A has: *owed only when yes* (`required` +
`activatedBy`) and *value survives a `no`* (omit `wipeOnExit`).

## 4. Counter-example 3 — the "live disagreement" is a ruling, not an incapacity

This is the part that inverts. `spec/conflicts.json:151-158`:

```
"id": "c-017",
"detail": "Wipe-vs-retain disagreement: … Spec defaults wipeOnExit=true on all conditional obligations;
           where retain is wanted this must be resolved at a gate session.",
"resolution": "Wipe on exit everywhere, confirmed: data whose determining condition flips out of scope
               is destroyed, not hidden. The skeleton's retained per-species values and the v4-model
               branch's retained regionCode are not requirements.",
"resolvedBy": "Sam — spec gate voice session 2026-07-07"
```

A's spec **names B's branch** ("the v4-model branch's retained regionCode"), records the retain reading
as a tracked conflict, and rules against it at a human gate. `spec/journey-spec.json:64` says the same:
"the spec defaults `wipeOnExit=true` on every `activatedBy` obligation (retain cases must be argued at a
gate; see conflict c-017)."

The claim says "A could not have represented B's reading even if it wanted to." The source says A
represented B's reading, put it in front of a human, and was told not to build it. This is the exact
failure mode the brief warns about: **conflating "not built" with "cannot be built"** — except here it
is worse than that, because it is "deliberately not built, with the decision minuted."

Whether the ruling is *right* about V4 is a requirements question, not a model question. Both readings
are expressible in A. Only one is expressible in B — B's `branchedGate` can return `{inScope:false}` for
the purge reading too, so B is fine either way as well. **Neither model is boxed in by this rule.**

## 5. What IS structurally true, and why it is the important half

A derives **one** bit per instance (`inScope`) and hangs three consequences off it: *owed* (via the
static `required`), *destroyed* (via the static `wipeOnExit`), and — by convention only — *shown*.
Requiredness therefore cannot carry a predicate **different from** the scope predicate. A cannot say
"in scope always; mandatory only when X". Its only way to say "optional now" is "out of scope now".

Two consequences, both of which the claim misses:

**(a) The conflation blocks the render half of the shopping list.** A's reveal is imperative today
(8 hand-written sites, L1-A §4), so "out of scope" costing visibility is currently free. The moment a
third option adopts B's derived field descriptors — which L2 recommends — every field modelled as
"optional-by-being-out-of-scope" would **vanish from the page** instead of rendering as optional.
B's accompanying-document block (`obligations.js:754-786`) is exactly this: four fields that must be
*shown and answerable* while not owed. Under A's model + B's descriptors, they would be hidden until
you picked a document type — a different journey. This is the real cost, and it is a retrofit blocker,
not a footnote.

**(b) A's substitute for "optional" — gate + retain — is unsafe wherever the field is a `requiredOneOf`
member.** `complete.js:21` checks the group with `isAnswered(entry?.[id])` — raw answeredness, **no
scope check**. So a retained-but-out-of-scope value still satisfies the group. That is precisely why
`wipeOnExit` is load-bearing there (`spec/conflicts.json:259`: "wipeOnExit keeps stale values from
satisfying the group"; pinned by `cross-frame.test.js:279`). So A can retain safely for a standalone
field like `regionOfOriginCode`, and *cannot* retain safely for an identifier-group member without also
fixing the group resolver to be scope-aware. Retrofit cost, correctly located.

Also worth recording, since it bears on porting B's document block to A: B's `accompanyingDocumentType`
gates **itself** (`obligations.js:764-768` — its own `applyTo` reads its own value). A's `activatedBy`
takes a real JS object reference, so a self-reference inside the same `const` declaration is a TDZ
error. A would model this differently (type unconditional-optional; the other three
`activatedBy: {obligation: documentType, present: true}` + `required: true`), which reaches the same
*owed* semantics but, per (a), the wrong *visibility* semantics.

## 6. What I searched

- `grep -rn "required" …/live-animals/engine` → only `status.js:23-24,63`, `complete.js:15-21,54,65`.
  No derived-required mechanism anywhere in the engine.
- `grep -rn "requiredWhen|mandatoryWhen|conditionalRequired|requiredIf" …/live-animals` → **zero hits**.
  Confirms no dormant conditional-mandate vocabulary in A.
- `grep -rn "wipeOnExit" …/live-animals` → 15 carriers in `features/*/obligations.js`; the flag is read
  in exactly one place (`reconcile.js:35`). Confirms opt-in.
- `grep -rn "enforcedAt" …/live-animals/flow …/features` → 2 carriers, read once
  (`flow/prerequisites.js:11`). Static too — the second mandate axis is no more derived than the first.
- `grep -rn "status ===|\.status\b|=== 'optional'" …/EUDPA-249-flow-layer --include=*.js` → located every
  consumer of B's `status` (engine/index.js, contract.js, CYA controller, units controller, dump.js).
  Confirms B's axis is honoured, not documentation.
- Read `spec/conflicts.json` c-017 and `spec/journey-spec.json:64` — found the ruling that inverts the
  claim's central rhetorical move.
- Read `features/origin/controller.js` — its validator does **not** enforce regionOfOriginCode when
  requirement = yes (only `maxText`). So A's conditional requiredness is carried entirely by the model,
  not smuggled into a controller. Strengthens §2.

## 7. Amended claim

A collapses *in scope* and *owed* into one derived bit: `required` is static
(`docs/obligation-model.md:19`, `engine/status.js:23-24`, `complete.js:54`) and the engine derives only
`{ inScope, wiped }` (`reconcile.js:47`), so **owed = required && inScope** (`status.js:60-63`). A
therefore *does* express conditional requiredness — `regionOfOriginCode` (`features/origin/obligations.js:12-17`)
is owed exactly when `regionOfOriginCodeRequirement === 'yes'` — and *does* express retention, since
`wipeOnExit` is opt-in (`reconcile.js:35`). What A cannot express is a requiredness predicate
**different from** its scope predicate: it cannot hold a field in scope (applicable, renderable,
hub-counted) while swapping mandatory↔optional. B can, via `branchedGate` returning the same `inScope`
with a different `status` (`obligations.js:190-198`, `:754-786`), and B honours it
(`engine/index.js:294-296`, `contract.js:316`, `:393`). This bites in two places: (a) once a model
adopts B's derived field descriptors, A's "optional = out of scope" idiom **hides** fields that V4 wants
shown-but-optional (the 4-field accompanying-document block); (b) A's gate+retain substitute for
"optional" corrupts `requiredOneOf`, whose group check reads raw answeredness with no scope filter
(`complete.js:21`) — which is why `wipeOnExit` is load-bearing (`conflicts.json:259`). The claimed
regionOfOriginCode "disagreement" is **not** evidence of a modelling gap: A's `spec/conflicts.json`
c-017 (`:151-158`) names "the v4-model branch's retained regionCode" and rules it out as a requirement at
a human spec gate (Sam, 2026-07-07). Both readings are expressible in both models; the sides disagree
about the requirement, not about what their models can say.
