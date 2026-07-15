# L3 adversarial verification — presentation-widgets — PW-6

**Claim under test:** B's sharpest defect is a MODEL defect, not a build gap: value
multiplicity (scalar vs array) has no slot in the domain type alphabet
`{enum, integer, string, date, address}`; it is a hard-coded 3-name `Set` in the
PRESENTATION layer keyed on the obligation's name, and a rendering decision then
determines the persisted value shape — so a rename the docs explicitly call safe
silently corrupts stored data with no test failure.

**Verdict: AMENDED.** The core layering fact survives every attempt to break it, and
I found two pieces of corroborating evidence the claim did not have. Three supporting
props are overstated: "no test failure" is false as written, the doc citation is
stretched, and "sharpest" is a superlative I would not defend. The *strongest true
version needs no rename at all* — and that version is worse for B than the one claimed.

---

## 1. Quote verification — every citation is real and means what the claim says

| Cited | Verified |
|---|---|
| `lib/field-widgets.js:56-62` `const OBLIGATION_MULTI = new Set([...])` | REAL — three **string literals**: `transitedCountries`, `species`, `animalsCertifiedFor`. |
| read at `:83`, `:116`, `:151` | REAL — `checkboxes` needs `OBLIGATION_MULTI.has(obligation.name)`; `radios` and `select` each need `!OBLIGATION_MULTI.has(obligation.name)`. Keyed on **name**, not id. |
| `contract.js:331-335` | REAL — `coerceValue`: `if (descriptor.widget === 'checkboxes') { if (Array.isArray(raw)) return raw; if (raw === '') return []; return [raw] }`. Every other widget falls through to `if (typeof raw === 'string') return raw`. |
| the widget→descriptor link (not cited, but load-bearing) | REAL — `lib/build-field-descriptors.js:84,104`: `const chosen = pickWidget({...})` … `widget: chosen.rule`. `descriptor.widget` **is** the winning rule id. The model→widget→persisted-shape chain is closed. |
| `domain/index.js:1099-1105` `metadata.shape:'staticEnumWithMaxSelections'`, `max: 12` | REAL. |
| "which the widget layer does not read" | REAL — `grep -rn "metadata" .../lib` returns **zero hits**. The presentation layer never touches `entry.metadata`. |
| `obligations/coverage.test.js` | REAL — asserts domain-wiring/allow-list, no `within` cycles, id uniqueness, name uniqueness. Never that `OBLIGATION_MULTI`'s three literals resolve to real obligations. |
| the type alphabet | REAL — factories are `staticEnum` / `computedEnum` / `predicate` / `addressBlock` (`domain/index.js:134-281`); `type` ∈ `{enum, integer, string, date, address}`. No multiplicity slot on the entry shape. |

## 2. New evidence the claim did not have — there is no validation backstop

`engine/index.js:78-95`, the single validator for every enum:

```js
const values = Array.isArray(value) ? value : [value]
const invalid = values.filter((v) => !options.includes(v))
```

Deliberately **shape-blind**: `'cattle'` and `['cattle']` validate identically. And the
one predicate that *does* know about arrays bails rather than complains —
`transitedCountriesDomain` (`domain/index.js:1084-1085`) opens with
`if (!Array.isArray(value)) return []`, so hand it a scalar and the max-12 cap simply
stops being enforced. **Nothing anywhere rejects the wrong shape.** The corruption path
is not merely untested, it is unvalidatable in the current model. This strengthens the
claim.

## 3. Counter-hunt #1 — "with no test failure" — FALSE as written

`lib/build-field-descriptors.test.js:76-86` drives the **real** flow + **real**
obligations:

```js
expect(desc[0].obligation.name).toBe('transitedCountries')
expect(desc[0].widget).toBe('checkboxes')
```

Rename `transitedCountries`: line 84 goes red; fix the literal and line 85 goes red —
which *is* the OBLIGATION_MULTI staleness, caught. One of the three names is guarded.
The Playwright walk also catches the claim's own worked example: `e2e/journey.js:302-306`
does `checkBox(page, \`species-${lineId}\`, value)`; with the checkboxes rule no longer
firing there is no checkbox to tick.

## 4. Counter-hunt #2 — but the vitest suite is genuinely blind to the SHAPE, and that is the better finding

I hunted for any assertion that pins the *stored value's shape*, or species'/
animalsCertifiedFor's checkbox-ness. There is none.

- **`routes.test.js:961-988`** is *titled* "renders one checkbox group with cattle-list
  options" — and asserts only `toMatch(/name="species-line1"/)` plus the labels
  `Cattle` / `Buffalo` / `Bison`. **`govukRadios` emits the same `name=` and the same
  labels.** The test named after the widget does not assert the widget; it stays green
  under a radios flip. Same shape of hole in the `animals-certified-for` test
  (`:991-1010`) — a `<select>` still contains the purpose labels.
- **`lib/field-widgets.test.js:63-77`** passes an object *literal*
  `{ name: 'transitedCountries' }`, not the real obligation — permanently immune to any
  rename of the model. A false-green by construction.
- **Every `server.inject` test injects an array directly** (`routes.test.js:948`,
  `e2e-commodity-lines.test.js:245,289,313,350,712`, `e2e-units.test.js:131`;
  `integration.test.js:440` seeds `{ line1: ['cattle'] }` by `species.id`). Under the
  radios rule, `coerceValue` takes the `typeof raw === 'string'` → false path and
  returns `raw` **unchanged**, so the injected array survives. The widget→shape coupling
  is structurally invisible to the whole in-process suite. Only a real browser — where a
  radio group submits exactly one scalar — produces the corruption.

Net: the rename goes red on *locator/name* assertions; the obvious fix (update the
strings) makes the suite green again **and the corruption ships**. That is a truer and
still-damning story than "no test failure".

## 5. Counter-hunt #3 — the rename framing is unnecessary; the defect fires on a FRESH obligation

`docs/add-an-obligation.md` is B's canonical recipe, and its worked example
(`:246-293`) is **`species` itself** — the multi-valued obligation. The listed steps are:
confirm declaration → domain entry → presentation → flow → infrastructure → remove from
KNOWN_UNWIRED → fixtures → tests → manual walk → commit. **`OBLIGATION_MULTI` is never
mentioned.** (`grep -rn OBLIGATION_MULTI` across the whole spike: `lib/field-widgets.js`
and one comment in `e2e/journey.js`. Zero hits in any doc.)

So a developer adding a new multi-select enum *by the book* declares a `staticEnum`,
wires it, and gets **radios** (≤ `RADIO_MAX=5` options) or a **single `<select>`**
(> 5) and a **scalar fulfilment** — because the model gives them no way to say "this one
is multi", and the recipe never tells them to reach into the presentation layer. No
rename required. This is the same defect with the contrived premise stripped out, and it
is the version that belongs in the shopping list.

## 6. Counter-hunt #4 — "A has no bug of this class" — holds, but by absence

A has no name-keyed Set of this kind in `engine/`, `flow/` or `shared/` (only in a test
file), and no widget→shape derivation — because A has **no widget derivation at all**
(L2: ~145 hand-authored macro call sites; persisted shape is fixed by explicit
controller parse). Confirmed, but it is immunity by absence: A has no field-type concept
to hang multiplicity off either. A is not modelling multiplicity better; it is not
modelling it at all. Do not bank this as a point in A's favour.

## 7. On "MODEL defect, not a build gap" — mostly right, with a caveat

The caveat is real: domain entries are duck-typed plain objects from open factories and
already carry non-alphabet keys that the widget layer reads (`addressBlock` attaches
`subFields`, `required`, `subFieldRules`, `isComplete()` — all four consumed at
`field-widgets.js:199-268`). Nothing validates `entry.type` against a whitelist. So the
model would **happily accept** a `multi` key; adding it is purely additive.

But cheapness of fix does not reclassify the defect. The fact "this obligation holds a
set of values" is a *domain* fact, it is **not expressible in the domain today**, and
fixing it means changing the domain entry shape — that is a model change, not a wiring
change. The claim's framing is right in kind; it should just not be read as "structurally
impossible". The precise name is a **layering defect in the model**: the domain omits a
slot, presentation improvises one, and persistence then reads the domain fact back out of
presentation. Note `coerceValue` also branches on `widget === 'number'` — harmless only
because the `number` rule keys off `entry.type === 'integer'` (domain-derived,
rename-proof). The `checkboxes` branch is the only name-keyed one. That is the bug's
exact perimeter.

## 8. On "sharpest" — not defensible

A superlative, not a fact. From the same dimension, the CYA `?change=1` round-trip is
documented in the present tense (`obligations.md:2338`) and **does not exist in code at
all** — that hits every user on every Change click, versus a shape flip that needs
someone to add or rename a multi-valued obligation. Keep the finding; drop the
superlative.

## 9. Retrofit

Add `multi: true` (or `cardinality: 'many'`) to the domain entry shape; set it on the
three entries; have the `checkboxes`/`radios`/`select` rules read `entry.multi` instead
of `OBLIGATION_MULTI.has(obligation.name)`; have `coerceValue` key on `entry.multi`, not
`descriptor.widget`; extend `engine.validate` to reject the wrong shape (it currently
accepts both); add a coverage assertion that every `multi` entry is enum-typed; add the
step to `docs/add-an-obligation.md`. ~20-30 LOC, purely additive. Do it **before**
anything else touches persistence.

## What I searched

`grep -rn` over the whole B spike for: `OBLIGATION_MULTI`, `checkboxes`, `Array.isArray`,
`maxSelections`, `shape:`, `multi`, `metadata` (in `lib/`), `species`, `validateObligation`,
`name:` (in `obligations/obligations.js`). Read in full: `lib/field-widgets.js`,
`lib/build-field-descriptors.js`, `lib/presentation.js:1-80`, `obligations/coverage.test.js`,
`contract.js:20-70,280-338`, `engine/index.js:30-103`, `domain/index.js:40-281,440-510,1060-1190`,
`obligations.md:2040-2099`, `docs/add-an-obligation.md:240-300`, `routes.test.js:958-1010`,
`lib/field-widgets.test.js:1-95`, `lib/build-field-descriptors.test.js:55-99`,
`e2e-commodity-lines.test.js:395-465`. Cross-checked A: `grep -rln "new Set(\["` and
`"Array.isArray"` over `engine/`, `flow/`, `shared/`, `lib/`.
