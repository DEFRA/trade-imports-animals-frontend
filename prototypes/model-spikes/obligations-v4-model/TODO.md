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
`evaluator-describe.js`) so runtime evaluator stays lean. Not V4-specific;
if adopted it belongs with the general model tooling, not this spike.

**Not blocking.** Alternative levers for the same concern (docs +
named-constant tests) already applied per option 3 of the
readability discussion. Pretty-printer is a runtime affordance that
would complement, not replace, docs.

## Backfill steps 1-3 obligations to `gatedBy` (iteration 4c)

**Why.** Steps 4-5 use the declarative `gatedBy` substrate landed in
4a; steps 1-3 still use imperative `applyTo` (`regionCode`,
`purposeInInternalMarket`, `commercialTransporter`,
`privateTransporter`, `transitedCountries`, `numberOfPackages`,
`cph`). Two ways of doing the same thing in one manifest is a
maintenance drag and undermines the "cut+paste, one shape" author
experience `gatedBy` was designed to give.

**What.** Rewrite each of the above obligations to use `gatedBy`.
Convert each `applyTo` body to the equivalent combinator expression.
Delete the now-redundant `indexedBy` metadata on `numberOfPackages`
(the derived-leaf reuse becomes a plain gated field record). Delete
the `applyTo`-specific helper branches in `purgeStorage` and
`buildImplication` if no obligation still uses them (which will be
the case once 4c is complete for anything with a gate).

**Expected worked-through examples:**

```js
// regionCode — retain-value extended form
gatedBy: {
  when: matches(regionCodeRequirement, 'yes'),
  whenTrue:  { inScope: true, status: 'mandatory', reasons: [...] },
  whenFalse: { inScope: true, status: 'optional' }
}

// purposeInInternalMarket — shortcut form (purge-on-flip is default)
gatedBy: matches(reasonForImport, 'internal-market')

// commercialTransporter — shortcut
gatedBy: matches(transporterType, 'commercial')

// transitedCountries — or of two matches
gatedBy: or(
  matches(meansOfTransport, 'railway'),
  matches(meansOfTransport, 'road-vehicle')
)

// numberOfPackages — depth-1 allowlist (no more derived-leaf reuse)
gatedBy: allowListed(commodityCode, PACKAGE_COUNT_COMMODITIES)

// cph — aggregation across commodity lines
gatedBy: any(commodityLine, allowListed(commodityCode, CPH_REQUIRED_COMMODITIES))
```

**Not blocking step 5.** Step 5 obligations (Accompanying Document
all-or-nothing) will use `gatedBy` from the start. 4c is purely
consistency work.

## Substrate refactor — collapse categories into `keyspace` metadata (iteration 4b)

**Why.** The current classifier assigns one of five categories
(`single` / `group` / `field` / `derived-leaf` / `user-leaf`) and
the pipeline branches per category. With `gatedBy` in place, the
category tells us less than it used to (a gated obligation's
behaviour is uniform regardless of category). The natural next step
is to reify identity level as first-class metadata (`keyspace`) so
the pipeline stops branching per category.

**What.** Every obligation declares `keyspace: scalar | field | user
| derived` explicitly (or has it inferred from within-chain +
absence-of-`indexedBy`). The pipeline treats every leaf uniformly:
enumerate its identity-space instance-paths, resolve scope per path
(via `gatedBy` or `applyTo`), purge, build implications. Categories
collapse to two — `group` (has descendants; no storage) and `leaf`
(has storage).

**Preference:** smaller composable functions, good quality naming
conventions for clarity. Any pipeline-step rewrite should be
decomposed rather than fused.

**Not blocking step 5.** 4b happens after 5 to keep the substrate
change independent of ongoing domain modelling.
