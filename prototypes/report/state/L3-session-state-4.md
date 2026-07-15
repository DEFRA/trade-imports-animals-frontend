# L3 — SS-4 adversarial verification

**Claim:** B's collection-instance existence is INFERRED from descendant composite keys rather than
stored, which forces three compensating mechanisms (seed placeholder, never-recycled ids, cascade
prefix sweep) that A does not need because its entries own their storage.

**Verdict: AMENDED.** The premise is true and the evidence is real, but the causal attribution is
wrong for two of the three "compensations", and the ledger on A's side is incomplete in a way that
hides a hazard B structurally cannot have.

---

## 1. What survives contact with the source

### The premise is true — and it is a MODEL statement, not an implementation shortcut

- `obligations/evaluator.js:390-421` `enumerateGroupFulfilmentIds` — a group's instance ids are the
  first N segments of any *descendant* leaf's composite key (`amendedFulfilments[desc.id]` at :409).
- `obligations/evaluator.js:202-218` `buildDescendants` — **"Transitive descendants (excluding
  self)"**. So a group's own storage key is never scanned. Writing `commodityLine: { line1: {} }`
  into the fulfilments map today is **inert** — it brings no instance into being.
- `obligations.md:1173-1176`: *"Group instance-paths (`line1`, `line1/unit1`) are inferred from the
  composite-key prefixes of descendant leaves' storage — **groups have no storage of their own**."*
  The doc states it as design intent, and the code honours it. (Amusingly, the doc's own worked
  example three lines earlier, `obligations.md:1164`, prints `commodityLine: { line1: {}, line2: {} }`
  — a shape the evaluator would ignore. The doc contradicts itself; the code is unambiguous.)

So: **not** a case of "doc credits something the code doesn't do", and **not** "not built vs cannot
be built" — the exclusion of self from the descendant scan is the model's stated position.

### The seed placeholder is genuinely forced by that premise — CONFIRMED

`lib/state.js:104-118` (`addCommodityLine`) and `:191-204` (`addUnitRecord`) each write `''` onto a
caller-chosen in-scope leaf so the evaluator will "recognise the line as existing". The comment says
exactly that. And the failure mode is admitted in the source: `features/units/controller.js:124-130`
— *"after a delete **or a commodity-code change that purges an earlier seed**, the surviving units
can have internal ids like unit2 + unit3"*. A gate flip can purge the seed and take the instance
with it. This half of the claim is unimpeachable.

### The compensations are load-bearing, not theoretical — both have already bitten

Two regression tests record real bugs that shipped and were fixed:
- `e2e-commodity-lines.test.js:228-234`: the delete list forgot `commodityType`, so the leaf
  `commodityType.line1` survived → *"the evaluator then still saw a record for line1 via that leaf,
  so the line stubbornly reappeared in the summary"*. **A deleted line resurrected**, via the prefix
  scan.
- `e2e-commodity-lines.test.js:604-626`: id allocation used lowest-free-slot, so delete-then-add
  reused `line1` and **silently rehydrated stale per-line state**. Fixed to highest-seen + 1.

---

## 2. Where the claim is wrong: the attribution of two of the three mechanisms

**The cascade prefix sweep is NOT caused by existence-inference. It is caused by flat,
column-oriented storage.**

B stores an instance's fields scattered across N obligation buckets (`commodityCode: { line1: … }`,
`species: { line1: … }`, `passport: { 'line1/unit1': … }`). Deleting `line1` therefore has to visit
every bucket — `lib/state.js:120-162`. Now suppose B *did* store instances explicitly
(`commodityLine: { line1: {} }`, the obligations.md:1164 shape). Deleting that one entry would still
leave `commodityCode.line1`, `species.line1`, `passport['line1/unit1']` … untouched, in their own
buckets. **The cascade survives verbatim.** Explicit group storage kills the *seed*, and nothing
else.

This matters directly for the shopping list: L2's proposed third option ("B's flat composite keys
with an explicit group-instance entry … restores entry-owned existence without giving up flat keys")
restores entry-owned *existence* but **not** entry-owned *storage*. You would still pay the cascade
tax. A's cheap delete comes from being **row-oriented** (the entry object physically contains its
fields, so `list.toSpliced(index, 1)` at `engine/write.js:48-60` takes them all), not from storing
an existence bit.

**The never-recycled-id rule is a guard against an incomplete cascade, not against inference.**

`lib/state.js:84-95` says the counter exists so a delete "cannot recycle the id — silent rehydration
of any per-line state **whose obligation is missing from LINE_LEAF_OBLIGATIONS**". Follow that list:
`features/commodity-lines/controller.js:43-54` — `LINE_LEAF_OBLIGATIONS = LINE_PAGES.map(p =>
p.obligation)`, derived from the **flow's pages**, not from the obligations manifest. The doc-comment
even records that deriving from the manifest (`within === commodityLine`) was tried and abandoned
because it mishandled groups and depth-2.

But the model already knows the exact answer: `obligationDescendants` (`evaluator.js:203-218`) gives
every transitive descendant of `commodityLine`. A delete that swept `key === lineId ||
key.startsWith(lineId + '/')` across that manifest-derived set would be exhaustive — and then id
recycling would be **safe**. The monotonic counter is belt-and-braces for a page-derived list, which
is a build choice B could fix inside its own model. Calling it "forced" is the claim conflating *not
built* with *cannot be built* — the exact failure mode the method warns about.

Note also a cost the claim misses: the counters live **outside** the fulfilments map, in two separate
yar keys (`lib/state.js:14-16`, cleared separately at `:228-232`). B's state document is therefore
**not self-contained** — persist the fulfilments map alone and resume, and ids recycle. That is a
fourth compensation, and it is a real one for anyone bolting A's records port onto B.

## 3. Where the claim is wrong: what A actually pays

The claim's A-side ledger is `lib/path.js` (63 LOC) + "two identity vocabularies … bridged, not
unified" (`docs/limits.md:46` — quote verified). It omits the sharper cost.

**A has no entry identity at all.** `grep -rn "randomUUID|nanoid|entryId|uuid"` across
`engine/` and `lib/` returns **zero hits**. Entries are identified purely by array position, and
positions **are recycled** — `lib/path.js:39` splices, `engine/write.js:55` `toSpliced`. Those
positions are load-bearing in the user-facing surface:

- `features/commodities/animal-identification.controller.js:543-556` — `getRemove` is a **GET**
  route reading `request.params.line` / `request.params.unit` as **numeric indices**, and passes
  them straight to `removeEntryAt`.
- `features/commodities/consignment-details.controller.js:20-21` — form field names are
  `numberOfAnimalsQuantity-${index}`.

So in A, after deleting animal 0 of line 0, a stale `/…/0/1/remove` link (back button, double-submit,
link prefetch) **deletes a different animal than the one it named**. B structurally cannot have this
bug: its ids are stable and never recycled, and B's source says so on purpose —
`features/units/controller.js:128-130`: *"The URL stays keyed by the internal id because URLs must be
stable across renumbering."* A's docs concede renumbering **only** inside a single wipe pass
(`docs/scope-and-wipe.md:106-111`, which is what `wipeOrder` exists for) — never for URL identity.

That is a genuine asymmetric capability **for B**, and the claim as written reads as if B's id
machinery were pure overhead A escaped. It isn't: half of it is buying something A never bought.

---

## 4. What I searched

- Read in full: B `lib/state.js`, B `obligations/evaluator.js:195-449`, B `obligations.md:1120-1200`,
  B `features/units/controller.js:95-155`, B `features/commodity-lines/controller.js:25-64`,
  B `e2e-commodity-lines.test.js:215-254, 595-627`.
- Read in full: A `engine/write.js`, A `lib/path.js`, A `engine/evaluate/reconcile.js`,
  A `features/commodities/animal-identification.controller.js:480-560`,
  A `features/commodities/consignment-details.controller.js` (index usage), A `docs/limits.md`.
- Counter-example hunts that came up **empty** (i.e. the claim held): a mechanism in B that stores
  group existence (`buildDescendants` excludes self; group storage is inert); an A code path where a
  gate flip annihilates an entry (`reconcile.js:32-45` only emits wiped paths for obligation nodes —
  entries have no obligation node, so only a whole *collection* can be wiped, never a single entry);
  stable entry ids in A (none exist).
- Counter-example hunts that **landed**: the cascade's true cause (column-oriented storage, survives
  explicit group entries); the counter's true cause (flow-derived delete list, fixable from the
  manifest via `obligationDescendants`); A's recycled positional identity in GET remove URLs.
