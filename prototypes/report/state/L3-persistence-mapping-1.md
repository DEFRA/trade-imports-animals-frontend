# L3 — persistence-mapping — PM-1 — VERDICT: AMENDED

**Claim under test (PM-1):** "Neither model carries ANY backend binding: 0 of 44 obligations on
either side has a **type**, backend path, serialiser or wire-format hint … Therefore a hand-authored
44-entry mapping table is unavoidable on BOTH sides, and the 'derive the mapper from the model' prize
is unclaimed by both."

**Destruction test the claim set for itself:** *"find one obligation on either side carrying a
backend path/type/serialisation key."*

**I met that test on Side B — 40 times.** The "no backend path" leg survives on both sides. The "no
type" leg is **false for B**, and with it the claimed **symmetry** of retrofit cost.

---

## 1. What the cited evidence actually shows (verification pass)

### Side A — cited quote is real, and doctrine IS honoured by code

`clone-live-animals/prototypes/standalone/live-animals/features/documents/obligations.js:1-4` reads
verbatim as quoted (`{ id: 'accompanyingDocumentType', required: true }`). I read **all 12** of A's
`features/*/obligations.js` files. Every key that appears on any record:

`id, required, requiredAtLeastOne, requiredOneOf, collection, item, activatedBy, wipeOnExit,
maxEntriesFrom, enforcedAt` — plus the `activatedBy` sub-keys `obligation / equals / includes /
frame / notInUnionOf`.

No `type`, no path, no serialiser, no wire hint. `docs/obligation-model.md:36` states it as doctrine
("There is deliberately no `type`, no copy, no widget choice and no validation on an obligation") and
the code honours it. A's mapper (`services/persistence/records/notification-mapper.js`, 507 LOC) is
hand-written imperative code — not even a table — and it **hand-codes the transforms a type would
have given it**: `isoFromDateParts` / `datePartsFromIso` (`:32-42`), `Number()` coercion in `totalOf`
(`:65-72`), the whole address/composite pass-through. A's type information exists only **per page**,
in controller validator compositions (`features/origin/controller.js:26-49` —
`maxText('regionOfOriginCode', 5, …)`, `pattern(…)`), keyed by field name, not by obligation, and
gated by nothing. A's `spec/journey-spec.json` *does* carry `kind` / `input.widget` / `validation`
per field — but it is **not loaded at runtime** (`grep -rln "journey-spec"` across A's tree hits only
`PROVENANCE.md`). It is a design artefact, not the model.

**Two small factual corrections to the claim's own wording** (not load-bearing, but it shows the
claim was written off A's doc rather than A's code): the "11-key vocabulary" list includes `system`
and `renderOnly`, which appear in **no obligation record anywhere in A** (only in `docs/` and
`contract.test.js`), and omits `enforcedAt`, which **is** live vocabulary — carried by
`commoditySelection` (`features/commodities/obligations.js:6`) and `countryOfOrigin`
(`features/origin/obligations.js:4`) and read by `flow/prerequisites.js:11`.

**Side A leg: CONFIRMED.** A's model carries no type and no backend binding.

### Side B — cited quote is real but the citation is off, and it is the wrong file to look in

`clone-flow-layer/.../obligations/obligations.js:412-417` (`commodityCode`) is exactly as quoted.
`numberOfPackages` is at **:469-477**, not :421-429 (:421-429 is `commodityType`). Across the whole
manifest the record keys are `id, name, within, status, applyTo, requires` — the claim's "exactly
`{id, name, within?, status?, applyTo?}`" omits `requires`.

So *within `obligations.js`* the claim holds. **But `obligations.js` is not B's whole model.**

---

## 2. THE COUNTER-EXAMPLE — B carries a per-obligation type registry, and it is test-gated

`clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/domain/index.js` is
self-described as **"Layer 1.25 of the three-layer architecture"** (`:1-8`). Its manifest
(`:1150-1194`) is `new Map([...])` **keyed by obligation id** with **40 entries** — one per
obligation. Every entry carries a `type`:

```
{ type: 'enum',    options: (fulfilments, ctx?) → string[], labels? }
{ type: 'integer', predicate, reasons }
{ type: 'string',  predicate, reasons }   // + maxLength
{ type: 'date',    predicate, reasons }   // DD/MM/YYYY, calendar-valid
{ type: 'address', subFields, required, subFieldRules, isComplete, predicate }
```
(`domain/index.js:13-17`, `:136`, `:149`, `:163-167`, `:197-216`, `:1055-1072`, `:1080-1106`)

And the composite type descends to **sub-field level with wire-shaped types and lengths**
(`domain/index.js:861-871`):

```js
const ADDRESS_SUB_FIELD_RULES = {
  name:         { type: 'string',    maxLength: 255 },
  addressLine1: { type: 'string',    maxLength: 255 },
  town:         { type: 'string',    maxLength: 100 },
  postcode:     { type: 'string',    maxLength: 12  },
  country:      { type: 'enum', options: COUNTRY_OPTIONS, labels: COUNTRY_LABELS },
  telephone:    { type: 'telephone', maxLength: 20  },
  email:        { type: 'email',     maxLength: 254 }
}
```

This is **not decorative and not documentation**. It is load-bearing runtime dispatch:
`lib/field-widgets.js` branches on `entry.type` at `:82`, `:115`, `:150`, `:199`, `:273`, `:298` and
on `rule.type` at `:24`, `:32`, `:236`, `:256` — the widget is *derived from the type*, not declared.

And it is **gated**: `obligations/coverage.test.js:80-86` fails the build if any obligation lacks
**both** a `domain` entry and a written allow-list exemption. The allow-list
(`coverage.test.js:27-41`) contains exactly **four** names — `commodityLine` and `unitRecord`
(structural groups, no value) and `poApprovedReferenceNumber` / `responsiblePersonForLoad`
(system-populated upstream). So **40 of 44 obligations carry a type, by enforced invariant, and the
4 that don't are the 4 that structurally cannot have one.**

L1-B's assertion that Layer 1.25 "declares no types" (`L1-persistence-mapping-B.md:279-281`) is
simply wrong on the source, and L2 inherited it into PM-1.

---

## 3. Why this matters — the claim erases the asymmetry it was hunting for

A mapper has three jobs. Score them separately:

| Mapper job | Side A | Side B |
|---|---|---|
| **Nesting / structure** (what goes inside what, how to iterate instances) | hand-coded — `groupLinesByCommodity` (`notification-mapper.js:53-61`), `speciesEntryFromLine` (`:79-89`) | **declared** — the `within` chain (`obligations.js:415`, `:564-565`) + generic depth-N instance enumeration (`evaluator.js:399-420`) |
| **Value type / transform** (date→ISO, string→integer, composite→object) | hand-coded — `isoFromDateParts` (`:32-36`), `Number()` in `totalOf` (`:65-72`) | **declared** — `domain` `type` + `maxLength` + `subFields`, 40/44, test-gated |
| **Name / path binding** (obligation → backend field path) | **not declared** — hand-written, 507 LOC, both directions | **not declared** — nothing to derive it from; the persisted key is an opaque UUID (`state.js:65`) |

The claim's conclusion is right **on row 3 only** — and row 3 is the one that genuinely deserves the
name "backend binding". But rows 1 and 2 are *not* symmetric, and PM-1 asserts they are ("both models
fail **identically**"). They do not. **A must hand-author all three rows. B must hand-author one.**

Corollary the claim gets backwards: PM-1 leans on "A's mapper works, B has never written one" to
argue parity of remaining cost. The source says the opposite — B has *more* of the mapper's inputs
declared than A does, and A's mapper is 507 LOC precisely *because* its model declares neither the
nesting nor the type.

Concrete, checkable consequence: a `type: 'date'` obligation in B is DD/MM/YYYY by declaration
(`domain/index.js:1055-1072`); the same field in A is a `{day, month, year}` blob whose ISO
serialisation is a hand-written 5-line function in the mapper, duplicated in reverse. Add a second
date field to A and you edit the mapper twice more. Add one to B and the type is already there.

---

## 4. Is this "not built" masquerading as "cannot be built"? Checked both ways.

- **Could A carry a type?** Yes, trivially — the record is a plain object; nothing prevents
  `type: 'date'`. But A's doc **rules it out on purpose** (`docs/obligation-model.md:34-42`: v1 had
  types, "no runtime code read them", v2 dropped them). So A's absence is a *decision*, not an
  oversight — which means retrofitting types to A means **reversing a stated design ruling**, and
  re-homing the per-page validator compositions. That is a real, if modest, cost, and PM-1 does not
  price it.
- **Could B carry a path?** Yes, additively — a `backendPath` key on the obligation record or a
  parallel id-keyed map, and `coverage.test.js`'s three-way gate extends to it verbatim. Nothing in
  B's design forbids it. So B's absence of a path IS "not built", not "cannot be built".
- **Does either doc over-claim?** A's obligation-model doc under-claims if anything (it omits
  `enforcedAt`). B's `obligations.md` is honest about the unbuilt persistence lifecycle. No
  doc-credits-code-doesn't-honour failure found on this claim.

---

## 5. What I searched

- Read all 12 of A's `features/*/obligations.js`; extracted every key from every record.
- `grep -rln "renderOnly"` across A → only `contract.test.js` + 4 docs; **no obligation record**.
- `grep -rln "journey-spec"` across A → only `PROVENANCE.md`; the typed spec is not runtime.
- `grep -rln "obligationsById|byObligationId|typeOf("` across A's `engine/` + `lib/` → nothing.
  A has **no** obligation-id-keyed registry of any kind other than the answers map.
- Read A's `notification-mapper.js` in full (507 LOC, both mappers, both directions).
- Extracted every key from B's `obligations/obligations.js` → `{id, name, within, status, applyTo,
  requires}`.
- `grep -n "type: '"` across B's `domain/index.js` → 12 hits; read the entry-shape header
  (`:13-17`), the factories (`:134-216`), the address sub-field rules (`:861-903`) and the manifest
  (`:1150-1194`).
- Read B's `obligations/coverage.test.js` in full — confirmed the domain-entry gate and the 4-name
  allow-list.
- `grep -n "type"` across B's `lib/field-widgets.js` → confirmed the type drives runtime widget
  dispatch.

---

## 6. Amended claim (the strongest version that IS true)

> **Neither model binds an obligation to a backend field path.** A's obligation record
> (`{id, required, …}`, 10 live keys, `features/*/obligations.js`) carries no path *and no type* —
> `docs/obligation-model.md:36` rules types out by design. B's obligation record
> (`{id, name, within?, status?, applyTo?, requires?}`) carries no path either, and its durable key
> is an opaque UUID (`state.js:65`), so nothing in B's persisted document hints at a destination.
> **A 44-entry obligation→backend-path table must therefore be hand-authored and gated on both
> sides, and the "fully derive the mapper" prize is unclaimed by both.**
>
> **But the two sides are not equally far from it.** B *does* declare, per obligation and gated by
> `coverage.test.js:80-86`, the other two inputs a mapper needs: the **type**
> (`domain/index.js:1150-1194` — 40 of 44 obligations, `enum | integer | string | date | address`,
> with `maxLength` and per-sub-field composite rules at `:861-871`, driving runtime widget dispatch
> in `lib/field-widgets.js`) and the **nesting** (the `within` chain plus depth-N instance
> enumeration at `evaluator.js:399-420`). A declares neither, and hand-codes both inside the mapper
> (`isoFromDateParts` `:32-36`, `Number()` coercion `:65-72`, `groupLinesByCommodity` `:53-61`) —
> which is a large part of why that mapper is 507 LOC.
>
> **Retrofit cost is therefore asymmetric: B needs the name/path column added to an already-typed,
> already-nested, already-gated registry; A needs the name/path column, a type system it has
> explicitly ruled out, and a structural walk it currently hand-writes per call site.**
