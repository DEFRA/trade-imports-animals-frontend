# L3 — Adversarial verification of asymmetry #10

**CAPABILITY:** A value domain inside the model — the model knows a field's legal
value set (codes+labels) so widget, validation, CYA and the gate predicate all
derive from one declaration, and gates compare locale-invariant codes.

**DIRECTION CLAIMED:** B-only (A absent). **CLAIMED COST:** structural — add a
value-domain slot to the obligation vocabulary + a derivation layer + reverse
decisions.md #6.

## VERDICT: REFUTED (the "structural" framing is wrong — this is unbuilt + an additive sidecar)

Three independent findings collapse the "structural" claim. A genuine
quality gap remains, but it is additive, not model-changing.

---

### Finding 1 — B does NOT put the value domain on the obligation vocabulary. It is a SIDECAR MAP keyed by id. A can copy that exact structure without touching its vocabulary.

The claim's stated structural cost is "add a value-domain slot **to the
obligation vocabulary**." That is not how B does it. B's obligation record
vocabulary is 6 keys — `id, name, within, status, applyTo, requires`
(L1-B §1.1; `obligations/obligations.js:793-838`). There is **no `options`,
no `labels`, no `values`, no `type`** on the obligation record. B is explicit:
`obligations.md:240` — *"Type — Not currently modelled as a field on the
obligation record."*

B's value domain lives in a **separate module keyed by obligation id**:
`domain/index.js:1150-1194`, 40 entries, built from four factories
(`staticEnum`, `computedEnum`, `predicate`, `addressBlock` —
`domain/index.js:134,148,163,197`). It is a parallel Layer-1.25, not a slot on
the record (L1-B §4).

Therefore A does not need a "value-domain slot in the obligation vocabulary" at
all. A can add the **identical parallel structure** — a new `domain/`-style
module keyed by obligation id — which is purely additive: a new module plus new
consumers. This is the standard "new module keyed by an id that already exists"
extension, not a change to the obligation model's shape.

### Finding 2 — decisions.md #6 is NOT reversed by a sidecar map. #6 removed ON-RECORD stamping; a separate id-keyed layer is exactly what #6's seam wanted.

The claim says the cost includes "**reverse the written decisions.md #6**."
Read what #6 actually decided (`docs/decisions.md:272-309`):

> *"The original v2 model **stamped each definition** with `type`, `pattern`,
> `min`, `max`, `maxLength`, `options` and `saveBlocking`… All of it was removed
> after a usage trace confirmed no runtime code read any of these fields."*

Two things follow:

1. **A already HAD an `options` slot** and populated it. It was removed by
   choice, not because the model cannot express it. "Re-add a key the model once
   carried" is the textbook signature of *unbuilt*, not *structurally
   impossible*. (`docs/obligation-model.md:36-42` restates the same removal.)

2. #6's objection is specifically to **stamping validity ON the obligation
   record**: *"The same value may legitimately be validated differently in
   different contexts, so validity cannot be a fact stamped on the obligation"*
   (`decisions.md:294-297`). A **sidecar map keyed by id** — precisely B's
   `domain/index.js` shape — does not stamp anything on the record. It is the
   *separate value-legality layer* #6 was steering toward. So the additive path
   **honours** #6; it does not reverse it. The claim inverts the decision.

The purity guard is a non-issue and the claim already concedes it
(`obligation-purity.js` scans only `features/*/obligations.js`; a new `domain/`
module is not one, so the guard never fires on it — and it already permits
`services/*/index.js` value-array imports anyway).

### Finding 3 — A's gates ALREADY compare locale-invariant codes; and B's gates do NOT derive from the domain either, so the "one declaration drives all four" asymmetry is overstated on B's own side.

The claim's second half — "gates compare locale-invariant codes" — is **already
true of A**. A's gate operands are raw codes compared with `===`:
`equals: 'yes'` (`features/origin/obligations.js:15`), `includes: ['Cow']`
(`predicate.js:12-29`, `applyPredicate`). The stored value is a code ('yes'),
separate from the rendered label ('Yes'). A's gate is locale-invariant today.
No change is needed for that half.

And the claim that in B "the gate predicate **derives from one declaration**" is
not even true of B for the equality case. B's own `regionCode` gate hardcodes
the code inside the closure:

```js
// obligations/obligations.js:191-196  (branchedGate)
(fulfilments) => fulfilments[regionCodeRequirement.id] === 'yes'
```

That `'yes'` is a literal in the closure body — it does **not** read from any
`domain/` enum for `regionCodeRequirement`. So B carries the *same* code
duplicated between gate-literal and domain-enum that A does. The clean
"widget + validation + CYA + gate all derive from one declaration" holds only
for B's `allowListed`/`staticEnum` membership gates, not for its equality /
`branchedGate` conditionals (9 of B's conditionals are `branchedGate` — L1-B
§2.1). The asymmetry the claim draws is narrower than stated even measuring B
against itself.

---

## The real gap (accurate, narrowed) — belongs in the shopping list as ADDITIVE

A genuinely lacks a value-legality/domain layer: it has **0 LOC** of one, and
consequently writes each value domain 3–4 times with nothing checking agreement
(model `equals:'yes'` / template `value:"yes"` / validator `oneOf(...,['yes','no'])`
/ dead spec `"equals":"Yes"` with different casing — L2 §3 item 5,
`origin/{obligations.js:15,template.njk:42,controller.js:33}`). A typo in a gate
string silently de-activates a field with no failing test. That is a real
quality deficiency and B's `domain/` layer + `labels`/`reasons` sidecars are
worth stealing.

But the cost is **additive, not structural**:

- New `domain/`-style module keyed by obligation id (B's is ~40 entries + 4
  factories) — a new module, not a vocabulary change.
- Wire widget / validation / CYA / gate operand to read it — new consumers, the
  same way every existing A key gained its consumer.
- No obligation-vocabulary slot required (B doesn't use one).
- No decisions.md #6 reversal (a sidecar honours #6; #6 forbade on-record
  stamping only).
- No purity-guard change (the guard doesn't scan a non-`obligations.js` module).
- No gate-comparison change (A already compares locale-invariant codes).

L2 §3 (line 144) already classes this family (items 4–6) as **"ADDITIVE for A …
missing, not impossible."** This verification confirms that classification and
rebuts the "structural / new vocabulary + reverse #6" cost the asymmetry
attaches to it.

## Where the concept CAN live in A (the CONFIRMED test, failed for the claim)

The task asks: point to the specific place in the model where the concept has
nowhere to live. There is such a place **for on-record stamping** (the 6-key
record deliberately has no slot). But the concept does **not** need to live on
the record — B proves it by putting it in `domain/index.js`. It has a natural,
already-blessed home in A: a parallel id-keyed module, exactly as `analysis/`,
`flow/dispatch.js` (id→page) and the `services/*` value arrays already sit
beside the model without being part of the record. The concept has a home; it is
simply unoccupied.
