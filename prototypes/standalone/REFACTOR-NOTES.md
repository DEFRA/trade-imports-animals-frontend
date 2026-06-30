# Standalone journey-model spikes — structural refactor notes

This was a pure structural refactor of four self-contained journey-model prototypes
(`spike-a` … `spike-d`), each demonstrating a different way to drive the same GOV.UK
"get a quote" journey. No behaviour changed: every spike still exports the same Hapi
plugin, the same `contract` surface, the same mount paths and the same template view
names. The only moves were splitting god-files into concern-sized modules, grouping
route builders, renaming files for what they do, and colocating tests beside the code
they exercise. Behaviour identity is proven by the full suite staying green — **788
unit tests across 85 test files** and **45 end-to-end specs** — with the superseded
originals parked under `_quarantine/` (excluded from the vitest run) rather than deleted.

## spike-a — declarative config + selectors

**Paradigm.** A declarative journey model (`model/journey.json`) interpreted by pure
selector functions, with derived validation and thin Hapi route wrappers.

**Structure chosen.** The paradigm core was left completely untouched: `runtime/`
(the selector contract) and `validation/` (compile + assemble) were already exemplary,
so nothing in them moved. All the work was in the harness around the selectors — the
five route builders were grouped under a thin `routes/` folder (separating Hapi plugin
assembly from route definitions), the `journey.js` god-file split into
`journey/{config,navigation,hub-view-model}` plus `routes/shell.js`, the 454-line
`lib/validate.js` became a `lib/validate/` folder grouped by field family behind a
barrel, and `lib/sections.js` separated its catalogue from its query helpers. Vague
names were made literal (`handlers.js` → `routes/section.js`).

**Why it fits.** In a declarative paradigm the model and the selectors over it _are_
the IP, and here they needed zero change — which is exactly why spike-a was the
lightest touch of the four. The two files that stay large (the ~290-line section
catalogue and the 235-line field-view engine) were deliberately left whole: each is a
single cohesive concern, and fragmenting a declarative catalogue would betray the very
paradigm the spike demonstrates.

## spike-b — statechart / FSM

**Paradigm.** A portable-data state machine (`model/machine.json`) executed by a
journey-agnostic interpreter; navigation falls out of guarded transitions rather than
being hand-coded.

**Structure chosen.** `runtime/` earned the deepest by-concern decomposition:
`model.js` and `interpreter.js` stayed untouched, while the 211-line `contract.js`
glue split into `steps / navigation / status / mutation / view / assembly` behind a
thin `contract.js` index that still exports the same 17 keys. The journey shell became
`journey/{config,links,hub}` behind an index that owns the two shell routes. The
oversized lib files became folder-modules with barrels, and two misnamed files were
renamed for what they do — `lib/joi.js` → `lib/page-validator.js` and `lib/domain.js`
→ `lib/assembler.js`.

**Why it fits.** The decomposition deliberately separates "where the machine says to go
next" (`runtime/navigation.js`, derived from guarded transitions and the reverse index)
from "what URL that maps to" (`journey/links.js`) — the clearest way to show the
statechart driving the journey. Depth tracks real complexity: multi-concern route files
(`addons-routes`, `endings`) became folder-modules, single-concern ones
(`claims-routes`, `section-routes`) stayed flat.

## spike-c — requirement-graph rules engine

**Paradigm.** A typed answer model (`model/fields.json`) plus a rules layer
(`model/rules.json`) with authored reasons, evaluated by a requirement-graph engine.

**Structure chosen.** A principled asymmetry: `runtime/engine.js` was kept **whole**
(the README-declared "part worth reading"; its WeakMap memo must stay single-identity),
while the thin `runtime/contract.js` glue was decomposed into
`runtime/contract/{view,navigation,status,mutation,assembly,index}`. The 454-line
`lib/validate.js` grab-bag fragmented into a runner plus per-field-family schema
modules; `sections`, `fields` and `addons` each became folder-modules behind barrels.
Route registrars were regularised onto the `-routes.js` convention
(`handlers` → `section-routes`, `endings` → `endings-routes`, `shellRoutes` →
`shell-routes.js`), and `lib/joi.js` / `lib/domain.js` were renamed to
`page-validator` / `assembler`.

**Why it fits.** The decompose-the-glue / preserve-the-core asymmetry is the whole
point: the engine is the legible IP and must stay one unit, whereas the contract is
explicitly "glue" and benefits from being split into the named concerns. This is the
one spike whose plan intentionally nests `runtime/contract/*` one directory deeper —
see Caveats.

## spike-d — schema-first (JSON Schema)

**Paradigm.** Validity lives in a portable JSON Schema (`model/quote.schema.json`) read
by an adapter, while ordering/grouping live in separate flow annotations
(`model/annotations.json`).

**Structure chosen.** This needed the heaviest surgery. The 399-line `runtime/contract.js`
god-module (nine-plus concerns) was dissolved into a `runtime/` folder decomposed strictly
by concern — `step-meta`, `applicability`, `status`, `navigation`, `mutation`,
`view-items`, `page-validation`, `assembly` — behind a thin `runtime/index.js` that
re-exports the unchanged `contract` surface. The schema adapter `validation/schema.js`
split into `schema-document / validate-value / conditionals / partial-check` behind a
barrel. The misnamed `runtime/model.js` was renamed `runtime/annotations.js` to correct
an inversion: in this paradigm the real _model_ is the JSON Schema in `validation/`, and
that file only loads flow annotations. `lib/validate`, `lib/sections` and `lib/addons`
became folder-modules; genuinely single-concern files (`lib/fields.js`, `lib/domain.js`)
were left whole even when long.

**Why it fits.** The structure now reads top-down — schema → adapter → runtime concerns →
thin contract → routes — matching the schema-first mental model, with the adapter (the
star of this paradigm) given its own decomposed folder so it reads as the comparison
signal versus the others.

## Cross-model comparison (real on-disk metrics)

Basis is identical across all four: **code files** = `.js` under the spike excluding
`_quarantine/` and `*.test.js`; **max file** excludes the generated `lib/data/quotes.json`;
**max depth** counts directory nesting below the spike root (a spike-root file = 0,
`lib/x.js` = 1, `lib/validate/x.js` = 2).

| Paradigm                                 | Code files | Max file (lines)                    | Max depth | Quarantined | Unit tests |
| ---------------------------------------- | ---------- | ----------------------------------- | --------- | ----------- | ---------- |
| spike-a — declarative config + selectors | 29         | 291 (`lib/sections/definitions.js`) | 2         | 9           | 25         |
| spike-b — statechart / FSM               | 43         | 293 (`lib/sections/data.js`)        | 2         | 13          | 18         |
| spike-c — requirement-graph rules engine | 44         | 291 (`lib/sections/definitions.js`) | 2         | 13          | 11         |
| spike-d — schema-first (JSON Schema)     | 39         | 291 (`lib/sections/registry.js`)    | 2         | 8           | 10         |

In every spike the largest remaining code file is the declarative section catalogue
(~290 lines) — a single cohesive data registry that is deliberately kept whole. Max
depth is a uniform 2 everywhere; no paradigm needed deeper nesting.

## Which productionised cleanest

**Winner: spike-a (declarative config + selectors).** It needed the lightest touch by
a clear margin — the paradigm IP (`runtime/` selectors and `validation/`) was left
_entirely_ untouched, so the refactor was pure harness tidy-up: group the routes, split
two genuine god-files, rename for clarity. It also carries the fewest code files (29)
and the fewest quarantined originals (9), and the result reads as a clean three-layer
story (model → selectors → routes) without any paradigm surgery. When the core of a
paradigm survives a structural refactor with zero edits, that is the strongest signal
it is production-ready.

**Runner-up: spike-c (rules engine).** Its decompose-the-glue / preserve-the-core
asymmetry is the most principled outcome among the three that did need surgery —
`engine.js` (the IP) stayed whole and only the thin contract glue was split. It loses
to spike-a only because it carries the most quarantined originals and the widest
import-graph rewiring, and because its intentional `runtime/contract/*` nesting is the
one structure that trips the naive isolation grep.

**Heaviest: spike-d (schema-first),** which had to dissolve a 399-line god-module and
correct a misnamed core file — the most invasive of the four, and the clearest counter-
example to spike-a's light touch.

## Caveats

- These remain **gated throwaway prototypes**, not production code. They live behind the
  standalone prototype harness and exist to compare paradigms, not to ship.
- `_quarantine/` holds **only** the superseded original files. No code imports from it
  (it is excluded from the vitest run via `vitest.config.js`), and the user should
  delete it once the comparison is settled.
- The literal isolation grep
  (`from '(\.\./\.\.|\.\./shared|prototypes/(shared|model-spikes))'`) **over-matches
  spike-c**: its approved plan nests `runtime/contract/*` one directory deeper, so files
  there legitimately import `'../../lib/...'` / `'../../journey/...'`. Those `../../`
  specifiers resolve to the _spike-c root_ (depth-2 dir + `../../` = spike root), i.e.
  they stay in-spike — every one was verified to resolve to an existing in-spike file.
  The other three spikes return zero grep hits. No spike imports anything outside itself.
