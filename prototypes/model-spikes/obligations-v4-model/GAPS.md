# Obligations V4 spike — gap log

Running log of gaps discovered while modelling
[Live Animals Data Fields V4](https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582)
against the obligations model from the EUDPA-249 spike (`../obligations/`).

Each entry records: the pattern hit, the obligation(s) affected, whether
it's a machinery gap or a conceptual/naming gap, and what (if
anything) was done to close it. Feeds `RECOMMENDATION.md` at the end
of the spike.

---

## Gap 1 — `derived-leaf` category covers more than pass-through controllers

**Pattern:** Field record inside a group, in scope conditionally on the
same line's answer to a sibling field.

**Obligation(s) affected:** `numberOfPackages` (this spike). Likely
recurs for `commodityType` if it turns out to be commodity-gated, and
for any future field of the form "per-line record, applicable only for
some commodity codes."

**Type:** _Conceptual / naming_ — the evaluator handles this case
without change. The mismatch is between the mental model
`derived-leaf` invites (established by the v3 spike's `modificationCost`
exemplar and `FULFILMENT_SHAPES.md` §E) and how V4 has to use it.

**Extension made:** None to machinery. `numberOfPackages` uses
`indexedBy: { source: 'derived', controllingObligation: commodityCode }`
with an `applyTo` that filters + projects `commodityCode`'s stored
map. Purge behaviour is correct out-of-the-box. See obligations.js and
the worked example below.

### The mismatch, worked through

**The v3 pattern.** `modificationCost` is derived from `modifications`
— a top-level multi-select storing an array:

```js
fulfilments[modifications.id] = ['turbo', 'alloys']

// derived-leaf applyTo passes those values through as record-ids:
records: fulfilments[modifications.id] ?? []
// → ['turbo', 'alloys']

// storage keys are the mod names themselves:
fulfilments[modificationCost.id] = { turbo: '800', alloys: '400' }
```

Reading `controllingObligation: modifications` tells the reader exactly
where the record-ids come from — they _are_ the controller's stored
values. `FULFILMENT_SHAPES.md` §E states this explicitly:

> Derived fulfilment ids are the controller's answer values, not
> opaque ids.

**The V4 pattern.** `numberOfPackages` is derived from `commodityCode`
— a per-line field record storing a keyed map:

```js
fulfilments[commodityCode.id] = {
  line1: '00000001', // made-up code, not in the packages-required list
  line2: '01064100', // bees — in the list
  line3: '01063100' // owls — in the list
}
```

The `applyTo` filters those entries and returns the **line-instance
ids** where the code is in the allowlist, not the code values
themselves:

```js
records: Object.entries(fulfilments[commodityCode.id])
  .filter(([_, code]) => PACKAGE_COUNT_COMMODITIES.includes(code))
  .map(([lineId]) => lineId)
// → ['line2', 'line3']
```

Storage keys are line-instance ids (opaque ULIDs in production):

```js
fulfilments[numberOfPackages.id] = { line2: 3 }
```

### Why the strong reading fails

Reading `controllingObligation: commodityCode` and applying the v3
pattern, a reader would expect record-ids to be the code values
`['00000001', '01064100', '01063100']` and storage keyed like
`{ '01064100': 3 }`. Two problems:

1. **Non-unique keys.** Commodity codes are not unique across lines.
   Two lines can both be bees, each with its own packages count. The
   code-keyed shape `{ '01064100': 3 }` cannot represent
   "`line2` = 3 packages, `line3` = 5 packages" — the entries collapse
   to one. Line-instance-id keying preserves independence:
   `{ line2: 3, line3: 5 }`.

2. **`FULFILMENT_SHAPES.md` §E's absolute claim is false here.** The
   derived record-ids ARE opaque ids (ULIDs), not answer values. The
   doc's clean rule needs a caveat.

### What we did instead

- Documented the pattern in `obligations.js` at `numberOfPackages`'s
  declaration with a comment header explaining the reuse and the
  line-instance-id keying.
- Tests use named line-id constants (`LINE_BEES = 'line2'` etc.) so
  the reader can see intent without decoding opaque ids — see
  `evaluator.test.js` step-3 blocks.
- This entry logs the gap for the recommendation write-up.

### Options considered, not taken

- **Extend the evaluator with a new `conditional-field` category.**
  First-class semantics for "field record with per-instance `applyTo`".
  Cleaner mental model, but requires classifier + purge + implication
  branch updates. Deferred — reuse fits without machinery change.
- **Denormalise storage** (e.g. `{ line2: { value: 3, commodityCode:
'01064100' } }`). Two sources of truth; kept-in-sync burden;
  storage-shape pollution. Rejected.
- **Encode meaning into keys** (e.g. `'commodityCode-01064100-uuid':
3`). Confuses identity with description; semantic drift when the
  user changes the code answer. Rejected.
- **Debug pretty-printer** for storage joins — see `TODO.md`. Not
  taken as an alternative; would complement docs+tests.
