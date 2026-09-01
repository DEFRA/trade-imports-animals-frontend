# Obligations V4 spike — TODO

Deferred improvements captured during the spike. Not spike-critical;
tracked here so they don't get lost.

## Debug pretty-printer for cross-obligation storage joins

**Why.** The flat composite-key `fulfilments` map is compact and
canonical, but individual fragments read in isolation are opaque. For
example, this line record:

```js
[numberOfPackages.id]: { line2: 3 }
```

is fine when you have the whole map next to it (you can cross-reference
`[commodityCode.id][line2]` to see `line2` is a bees line), but is
uninformative on its own — you can't tell what `line2` refers to or
why `3` is stored there. This bites during log inspection, DB dumps,
and error messages.

**What.** A pure helper — `describe(fulfilments, { obligations })` —
that returns a human-readable trace joining storage across
obligations. Rough shape:

```
line1 [commodityCode = 00000001]:
  (numberOfPackages not offered — code not in list)
  numberOfAnimals  = 40

line2 [commodityCode = 01064100 (bees)]:
  numberOfPackages = 3
  numberOfAnimals  = 250

line3 [commodityCode = 01063100 (owls)]:
  (numberOfPackages offered, not answered)
  numberOfAnimals  = 12
```

**Where it goes.** TBD — likely a sibling module (e.g.
`evaluator-describe.js`) so runtime evaluator stays lean. Not
V4-specific; if adopted it belongs with the general model tooling,
not this spike.

**Not blocking.** Alternative levers for the same concern (docs +
named-constant tests) already applied.

## Data-dictionary export via helper metadata

**Why.** The applyTo + helpers approach preserves runtime flexibility
but hides the gate structure inside JS closures. Helper metadata
(`obligation.applyTo.metadata`) reclaims this selectively — worth
building a small exporter that walks the manifest, reads
`.applyTo.metadata` for each obligation, and emits a data-dictionary
format (JSON / YAML / whatever downstream needs).

**What.** Iterate `obligations`. For each obligation build an entry:

- `id`, `name`, `within.name`, `status`
- `applyTo.metadata` if present (describes the gate declaratively)
- `applyTo` source code as a string fallback when no metadata (for
  hand-written applyTo)

**Where it goes.** New module `data-dictionary.js`, exports a single
function that returns the manifest structure. Consumed by whatever
downstream (frontend renderer, backend validator, docs generator)
needs a data view of the obligations.

**Not blocking.** No current consumer; scaffolding for future needs.
