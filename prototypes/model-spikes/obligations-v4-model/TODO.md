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
