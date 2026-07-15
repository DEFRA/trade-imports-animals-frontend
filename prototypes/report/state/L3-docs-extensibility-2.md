# L3 — Adversarial verification — DE-2 (docs-extensibility)

**Claim under test:** A's obligation record *structurally cannot* carry the facts needed to
derive presentation — no `type`, no copy, no widget choice, no validation — by explicit
design. Therefore L1-A's "export the predicate" fix collapses only the visibility ternary,
cannot remove the hand-written label or value formatter, and **A's per-field presentation
cost can never amortise without changing the obligation record itself.**

**VERDICT: AMENDED.** The *descriptive* half is true and well-evidenced. The *modal* half —
"structurally cannot", "can never amortise without changing the obligation record" — is
false, and it fails on four independent grounds, one of which is the claim's own cited
sentence.

A = `clone-live-animals` @ b6ac2ed, `prototypes/standalone/live-animals/`
B = `clone-flow-layer` @ d59b432, `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

---

## 1. Step 1 — the quote is real, and it is accurate

`docs/obligation-model.md:36-42`, read at source:

> ### Why so thin
>
> There is deliberately no `type`, no copy, no widget choice and no
> validation on an obligation. **The v1 model carried all of those, and a
> usage trace during the rebuild found that no runtime code read them** —
> every widget, label and value domain was already re-declared in the
> page templates and controllers. So v2 dropped the dead copies: pages
> own presentation, controllers own validation, and the model keeps only
> the facts the engine actually evaluates.

Verbatim. And the B-side contrast in the evidence is also real and correctly cited:
`lib/field-widgets.js:64` (`export const RADIO_MAX = 5`), `:68` (`export const rules = [`),
`:82-83` (`if (entry?.type !== 'enum') return null` / `if (!OBLIGATION_MULTI.has(obligation.name)) return null`),
`:117` (`if (options.length > RADIO_MAX) return null`). First-match-wins rule table, confirmed.

**What is true, and stays true:** today A carries no `type`, label, widget or validator on
an obligation; nothing in A's runtime derives presentation from the model; CYA rows are
hand-composed with an inline label, an inline value formatter and a hand-coded visibility
ternary (`features/check-answers/controller.js:106-119`). So the L1-A "export the
predicate" fix really does collapse only the ternary and leaves the label and the formatter
hand-written. **That sub-claim is CONFIRMED.**

Everything after the word *therefore* is where it breaks.

---

## 2. Step 3 — "not built" vs "cannot be built". The claim conflates them.

### 2a. The claim's own evidence refutes it, one clause later

`obligation-model.md:37` — **"The v1 model carried all of those."**

The record *has* held `type`, copy, widget choice and validation. On the same object shape.
They were removed because **no derivation layer consumed them** — "a usage trace found that
no runtime code read them" — not because the record could not hold them. The missing thing
in A is a **reader**, not a **carrier**. That is the textbook unbuilt-vs-unbuildable
conflation, and the sentence the claim quotes as proof of a structural limit is in fact a
record of the deliberate deletion of a capability that once existed.

### 2b. There is no schema, no key allowlist, and nothing that would reject a new key

A's boot guards are exactly two (`routes.js:20-21`):

```js
assertObligationPurity()
buildDispatch(dispatchPages)
```

Neither inspects the *keys* of an obligation. `buildDispatch` reads `obligation.id` and
`obligation.system` (`flow/dispatch.js:33,58`). I enumerated every key the engine + flow ever
read (grep `obligation\.` across `engine/` and `flow/`): **`id`, `activatedBy`, `wipeOnExit`,
`item`, `requiredOneOf`, `requiredAtLeastOne`, `system`, `enforcedAt`** — eight, all read by
name. An obligation is a plain object literal. **An unknown key is inert.** Adding
`type: 'enum'`, `label: '…'`, `widget: 'radios'` or `rules: {maxLength: 255}` to
`regionOfOriginCode` today changes no behaviour and breaks no guard.

`obligation-model.md:14` says "An obligation is a plain object with **at most** these
fields" and `:30` says "That is the whole vocabulary". Both are prose. Nothing enforces
either.

### 2c. The vocabulary is not closed — it has ALREADY grown, and the doc has not caught up

- `flow/prerequisites.js:11` — `if (obligation.enforcedAt !== 'continue') continue`
- `features/origin/obligations.js:4` — `enforcedAt: 'continue'`
- `features/commodities/obligations.js:6` — `enforcedAt: 'continue'`

`enforcedAt` is a **mandate-enforcement key carried on the obligation record and read by the
flow layer**. It does not appear anywhere in `obligation-model.md`'s "whole vocabulary"
table (`:16-28`). It was added post-hoc, and `DESIGN-DELTA.md:143-171` (#6) documents the
addition together with its backwards-compatibility argument:

> Backwards compatible: an obligation with no `enforcedAt` is never anyone's RULE 1
> prerequisite, so existing sequencing is unchanged for every other field.

That is the exact retrofit shape — **new key, absent = default, opt-in, back-compatible** —
and A has run it **15 times** (DESIGN-DELTA is 15 numbered engine divergences). A model that
demonstrably absorbs a new key 15 times over is not one that "structurally cannot carry" a
sixteenth. The claim mistakes A's *doc* for A's *type system*. There is no type system.

### 2d. The one real structural constraint — purity — has ALREADY been relaxed, and permits exactly what the claim says is impossible

`obligation-purity.js` is the only boot-enforced constraint on `obligations.js`, and it
restricts **imports, not keys**. It has already been widened:

```js
export const isReferenceServiceImport = (specifier) =>          // :13-14
  /(^|\/)services\/[^/]+\/index\.js$/.test(specifier)

const isPermittedObligationImport = (specifier) =>               // :16-17
  isSidewaysObligationImport(specifier) || isReferenceServiceImport(specifier)
```

Three obligation files already exercise it, calling a reference-data service **at module load
to source value lists into the model**:

- `features/commodities/obligations.js:1` — `import * as commodities from '../../services/commodities/index.js'`; `:15` `includes: commodities.packageCountCommodities()`; `:32` `enclosingCommodity(commodities.passportCommodities())`
- `features/cph-number/obligations.js:2,10` — `includes: commodities.cphCommodities()`
- `features/additional-details/obligations.js:2`

So the *hardest* presentation fact to carry — a **dynamic, service-sourced option list** (the
thing `spec/journey-spec.json:549` calls `valuesSource: "…reference-data countries client…"`)
— is already permitted by the purity guard and already used in the model today. A literal
`label: 'Region of origin code'` or `widget: 'radios'` needs no import at all. **Purity
forbids presentation *code* in the model. It does not forbid presentation *data*.** Nor does
B put presentation code in its model — B derives it in a rule table sitting outside it.

### 2e. The facts already exist, per obligation, in A's own tree

`spec/journey-spec.json` — A's machine-readable spec, authored and maintained through M3 —
carries, keyed by obligation id, precisely the facts the claim says A cannot carry:

| Obligation | `label` | `input.widget` | `input.values` / `valuesSource` | `input.hint` | `kind` |
|---|---|---|---|---|---|
| `countryOfOrigin` (:538) | :546 "Country of origin" | :548 `"select"` | :549 MDM countries list | — | :540 `"scalar"` |
| `regionOfOriginCodeRequirement` (:564) | :572 "Does the consignment have a region of origin code?" | :574 `"radios"` | :575 `["Yes","No"]` | :576 "If a region of origin code is required…" | :566 `"scalar"` |

`grep -rln "journey-spec"` across the whole root returns **one hit — `PROVENANCE.md`**.
Nothing in the runtime reads it. The authoring work is **done**; it is simply never projected
onto the record. The retrofit is a projection, not a data-gathering exercise. That makes A's
retrofit cost *lower* than the claim implies — and retrofit cost is a first-class question.

---

## 3. The killer: **B does not carry these facts on its obligation record either**

This breaks the claim's framing outright.

The claim's final clause is *"can never amortise without changing the obligation record
itself"*, with B held up as the proof of what amortisation looks like. But B's `type`,
options, labels and validators are **not on B's obligation record**. They live in a
**separate, parallel descriptor registry**:

- `domain/index.js:14-17` — the type vocabulary:
  `{ type: 'enum', options: (fulfilments, ctx?) → string[], labels? }`,
  `{ type: 'integer', predicate, reasons }`, `{ type: 'string', … }`, `{ type: 'date', … }`
- `domain/index.js:862-870` — the address composite: `name: { type: 'string', maxLength: 255 }`,
  `country: { type: 'enum', options: COUNTRY_OPTIONS, labels: COUNTRY_LABELS }`, …
- `lib/field-widgets.js:82` reads **`entry.type`** — `entry` is the *domain* descriptor, **not** the obligation
- `lib/field-widgets.js:83` reads **`obligation.name`** — i.e. the **join key** between the two registries
- copy lives in a third registry again — `locales/en.json` via `lib/i18n.js`

B's derivation chain is **obligation (scope/mandate) ⋈ domain (type/options/validation) ⋈
locales (copy)** — three registries joined by id. B achieved its amortisation by **adding
sidecars**, not by fattening its obligation. `obligations/obligations.js` in B carries scope
and mandate, same as A's.

The route B took is therefore **open to A at zero cost to the obligation record**, and A is
unusually well-placed to take it: `obligation-model.md:18` documents that A's `id` is already
"the key in the answers map and the DOM field name — **one string, three roles**". A join key
that is simultaneously the model id, the store key and the DOM name is the ideal spine for
exactly this sidecar. A already has the id spine, the boot-time obligation walk
(`registry.js#walk`) to iterate it, and the spec JSON holding the values.

**The claim asserts the impossibility of the very thing its own comparator did, by the very
means available to A.**

---

## 4. What I searched (so the next reader does not redo it)

| Hypothesis I tried to prove | Result |
|---|---|
| A has a schema / key allowlist that rejects unknown obligation keys | **None.** `routes.js:20-21` = purity + dispatch only; neither reads keys. |
| The engine breaks on unknown keys | **No.** Grep `obligation\.` over `engine/` + `flow/` → 8 named key reads. Unknown keys inert. |
| The purity guard forbids carrying presentation facts | **No.** `obligation-purity.js:8,10-17` scans *import specifiers* only, and already permits `services/*/index.js`. |
| No obligation carries anything beyond the documented vocabulary | **False.** `enforcedAt` (`flow/prerequisites.js:11`, `origin/obligations.js:4`, `commodities/obligations.js:6`) is absent from the doc's vocabulary table. |
| No obligation sources data from outside itself | **False.** 3 files call `services/commodities` at module load (`commodities/obligations.js:1,15,32`; `cph-number:2,10`; `additional-details:2`). |
| A has no per-field label/widget/hint data anywhere | **False.** `spec/journey-spec.json` has all of it per obligation (`:546-549`, `:572-576`). Read by nothing (`grep -rln "journey-spec"` → `PROVENANCE.md` only). |
| B carries `type`/copy/validation on its obligation record | **False.** `domain/index.js` + `locales/en.json`, joined via `obligation.name` (`field-widgets.js:83`). |
| A already derives any presentation from the model | **No.** Hand-written label + formatter + ternary confirmed at `features/check-answers/controller.js:106-119`. The claim's descriptive half stands. |

---

## 5. Why the amendment matters for the third option

As written, the claim reads as an **asymmetric-capability finding** ("A structurally
cannot"). It is not one. Demoting it matters, because an asymmetric-capability finding says
*abandon A's model*, whereas the true finding says *A's model is missing a layer that bolts on
beside it, backwards-compatibly, using data A has already authored*.

The retrofit A would actually pay:

1. A `domain.js` sidecar (per feature, or one registry), keyed by obligation `id`, carrying
   `type` / `options` / `labels` / `hint` / `rules` — **populated by projecting
   `spec/journey-spec.json`, which already holds every value**.
2. A widget-derivation table — B's `lib/field-widgets.js` reads `entry.type` + `options.length`.
   Portable near-verbatim.
3. A generic CYA that walks scope × sidecar instead of 25 hand-composed `row(…)` calls.
4. Export `applyPredicate`/`evalPredicate` from the engine facade (L1-A's fix) — still needed,
   still cheap, and it now pulls its weight because it feeds the generic renderer.

The obligation record need not change at all. Purity holds (a sidecar is not imported *by*
`obligations.js`; it imports *from* it). The 15-delta back-compat discipline is not even
engaged, because nothing is added to the record.

**The honest asymmetry is smaller and sharper than the claim:** B has *built* the derivation
layer and amortised it across 31 pages / 44 obligations; A has *not built* it and pays
per-field for its absence. That is a real, large, present cost — L2's "B-better" verdict on
this dimension survives intact. But it is a **one-layer debt with the data already authored**,
not a structural ceiling, and it does not require touching the obligation record.

---

## 6. Steelman I could not sustain

Strongest defence of "structurally" I could construct: *the purity contract is boot-enforced,
so the model cannot reach presentation, so it cannot carry presentation.* It fails on the
source. Purity constrains **imports**, and it has **already been relaxed**
(`obligation-purity.js:13-14`) to admit reference-data services — which the model **already
uses** to source dynamic value lists. Literal copy, a `type` string and a widget name need no
import whatsoever. And the derivation layer lives *outside* the obligation module on both
sides, so purity never comes into contact with it.

Second steelman: *`obligation-model.md:139-143` says "anything that needs real branching
belongs in a page controller — that is the pressure valve", so the design deliberately
forecloses derivation.* Deliberate ≠ structural. A design preference that its own DESIGN-DELTA
process has overturned 15 times, on a plain object with no schema, is a **preference** — and
preferences are exactly what a third option is entitled to overrule.
