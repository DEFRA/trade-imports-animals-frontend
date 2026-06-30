# Standalone journey-model spikes — structural refactor notes

This is a pure structural refactor of four self-contained journey-model prototypes
(`spike-a` … `spike-d`), each demonstrating a different way to drive the same GOV.UK
"get a quote" journey. No behaviour changed at any point: every spike still exports the
same Hapi plugin, the same `contract` surface, the same mount paths and the same template
view names.

It happened in three passes, each its own commit, each proven green end to end
(**788 unit tests across 85 files** and **45 end-to-end specs**):

1. **Structural split** — group route builders, split god-files, colocate `*.test.js`,
   rename files for what they do.
2. **Function decomposition** — apply the 16-rule style guide's "do one thing" and
   "small composed functions" to every file: break multi-purpose functions into small
   named helpers, turn large switches into `kind → builder` dispatch tables, collapse fat
   route factories into flat declarative route tables, name every callback parameter.
3. **File split** — break every remaining logic file over ~150 lines into concern-sized
   folder-modules behind thin `index.js` barrels.

The end state: **every logic file is ≤ 147 lines**, every function does one thing, and the
only large files left are the flat `sections` data catalogues (~290 lines, one-thing by
design). Superseded originals are parked under `_quarantine/` (gitignored, excluded from
the vitest run) rather than deleted.

## spike-a — declarative config + selectors

**Paradigm.** A declarative journey model (`model/journey.json`) interpreted by pure
selector functions, with derived validation and thin Hapi route wrappers.

**Structure.** The runtime contract became a folder-module
`runtime/selectors/{constants,status,navigation,mutation,view,index}` — `status` is a
small dispatcher over `loopStatus`/`subtasksStatus`/`fieldStatus`, and `index.js` exports
the unchanged `contract`. Validation split into `validation/compile/*` and
`validation/assemble/*`; the DOB schema into `lib/validate/date/{calendar,constraints,
required-schema,optional-schema}`; add-ons into `lib/addons/{catalogue,selection,
completion,views}`; the field-view engine into `lib/fields/{input-views,block-views,
choice-views,registry,errors,collect}`. Route factories collapsed to flat
`{method,path,handler}` tables under `routes/<name>/{handlers,view-models,index}`.

**Why it fits.** The model and the selectors over it are the IP; decomposing the selectors
into navigation / status / mutation / view modules mirrors the declarative-derivation
philosophy directly. The section catalogue stays whole — fragmenting a declarative data
list would betray the paradigm.

## spike-b — statechart / FSM

**Paradigm.** A portable-data state machine (`model/machine.json`) executed by a
journey-agnostic interpreter; navigation falls out of guarded transitions.

**Structure.** `runtime/` keeps `model.js` and `interpreter.js` whole and splits the glue
into `steps / navigation / status / mutation / view / assembly` behind a thin
`contract.js`. The validators became folder-modules: `lib/validate/date/*`,
`lib/assembler/{transform,errors}`, `lib/page-validator/{schemas,date-rules}`,
`lib/fields/to-view/{inputs,choices,registry,errors,hint}`. The journey shell is
`journey/{config,links,hub}`; route files that mixed concerns became
`claims-routes/*`, `addons-routes/*` and `endings/*` folder-modules.

**Why it fits.** It keeps "where the machine says to go next" (`runtime/navigation.js`,
derived from guarded transitions) separate from "what URL that is" (`journey/links.js`) —
the clearest way to show the statechart driving the journey.

## spike-c — requirement-graph rules engine

**Paradigm.** A typed answer model (`model/fields.json`) plus a rules layer
(`model/rules.json`) with authored reasons, evaluated by a requirement-graph engine.

**Structure.** A principled asymmetry, preserved and deepened: the engine became
`runtime/engine/{evaluation,missing-required,assertions,index}` (decomposed by concern but
kept as the readable core, with its memo intact), while the thin contract glue is
`runtime/contract/{view,navigation,status,mutation,assembly,index}`. Validators split into
`lib/validate/date-of-birth/*`, `lib/page-validator/*`, `lib/assembler/{transform,errors,
business-rules}`, `lib/field-view/to-view/*`; route registrars into `endings-routes/*`,
`addons-routes/*`, `claims-routes/*`.

**Why it fits.** The decompose-the-glue / readable-core asymmetry is the whole point of
this paradigm — the engine (where required-ness and authored `because` are derived) reads
as one story, the contract is plumbing.

## spike-d — schema-first (JSON Schema)

**Paradigm.** Validity lives in a portable JSON Schema (`model/quote.schema.json`) read by
an adapter, while ordering/grouping live in separate flow annotations
(`model/annotations.json`).

**Structure.** This started as the heaviest case — a 399-line `runtime/contract.js`
god-module — and ended fully decomposed: `runtime/{step-meta,applicability,status,
navigation,mutation,view-items,page-validation,assembly,annotations,index}`, with the
schema adapter as `validation/{schema-document,validate-value,conditionals,partial-check,
index}`. The Joi factories split into `lib/validate/{date,number,text}-schema/*`; the
mixed journey file into `journey-shape.js` / `nav.js` / `shell-routes.js` /
`status-tags.js`. `runtime/model.js` was renamed `runtime/annotations.js` to correct an
inversion — the real _model_ here is the JSON Schema in `validation/`.

**Why it fits.** The structure now reads top-down — schema → adapter → runtime concerns →
thin contract → routes — matching the schema-first mental model.

## Cross-model comparison (real on-disk metrics)

Basis is identical across all four: **code files** = `.js` under the spike excluding
`_quarantine/` and `*.test.js`; **max logic file** excludes the generated
`lib/data/quotes.json` and the `lib/sections` data catalogue; **max depth** counts
directory nesting below the spike root (`lib/x.js` = 1, `lib/validate/date/x.js` = 3).

| Paradigm                                 | Code files | Max logic file (lines) | Max data file | Max depth | Quarantined | Unit tests |
| ---------------------------------------- | ---------- | ---------------------- | ------------- | --------- | ----------- | ---------- |
| spike-a — declarative config + selectors | 64         | 145                    | 291           | 3         | 8           | 25         |
| spike-b — statechart / FSM               | 59         | 141                    | 296           | 3         | 5           | 18         |
| spike-c — requirement-graph rules engine | 67         | 128                    | 291           | 3         | 8           | 11         |
| spike-d — schema-first (JSON Schema)     | 63         | 147                    | 292           | 3         | 5           | 10         |

The largest file in every spike is now the declarative `sections` catalogue (~290 lines) —
a single cohesive data registry, deliberately kept whole. Every _logic_ file is ≤ 147
lines; max depth is a uniform 3 (folder-modules one level deeper than the original layout).

## Which productionised cleanest

The striking result of pushing decomposition all the way is that **all four paradigms
converge to a very similar end shape** — 59–67 small single-concern files, max logic file
128–147, depth 3. The differentiator is not the destination but **how much surgery each
paradigm needed to get there**.

**Cleanest: spike-a (declarative config + selectors).** Its paradigm core (the selector
contract and derived validation) was already correct in the original spike — it survived
the first structural pass with zero edits, and only later passes (shared by all spikes)
touched it. The least conceptual work to productionise.

**Runner-up: spike-c (rules engine).** The decompose-the-glue / keep-the-engine-readable
asymmetry held through all three passes and ended with the smallest max logic file (128).

**Heaviest: spike-d (schema-first).** It carried the worst starting point — a 399-line
god-module and a misnamed core file — and needed the most invasive work across all three
passes, even though it lands in the same place as the others.

The honest summary: **a schema-first or rules-engine model is not harder to productionise
than a declarative one — it just starts further from it.** Once decomposed, every paradigm
reads cleanly; the cost is paid up front in how tangled the prototype glue was.

## Caveats

- These remain **gated throwaway prototypes**, not production code. They live behind the
  standalone prototype harness and exist to compare paradigms, not to ship.
- `_quarantine/` holds **only** superseded originals. No code imports from it (it is
  gitignored and excluded from the vitest run via `vitest.config.js`), and it can be
  deleted once the comparison is settled.
- **Isolation** is verified by a depth-correct import resolver, not a grep: every relative
  import in all four spikes resolves to an existing in-spike file and none escapes the
  spike. (A naive `../../`-style grep now over-matches in every spike, because the
  folder-modules legitimately import up to the spike root from depth-3 files — those
  specifiers stay in-spike.)
- The only single-letter identifier left is the Hapi response-toolkit `h`, kept because it
  is the repo-wide framework idiom; renaming it in the prototypes alone would diverge from
  every other handler in the codebase.
