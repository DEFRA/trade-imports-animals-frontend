# L3 — Adversarial verification of asymmetry #14

**Capability:** Retain a value while the field is HIDDEN — hide a field when its
gate closes but keep the previously-entered value so it re-appears pre-filled.
**Direction claimed:** A-only (A modelled-declaratively; B absent, "cannot
express at all"). **Claimed cost to close in B:** small-structural (a
`retainOnExit` opt-out key + a branch in `purgeStorage`).

## VERDICT: REFUTED — the "structural / cannot express at all" framing is wrong on two independent grounds.

---

### 1. A's mechanism is real but UNBUILT — latent expressibility, not demonstrated behaviour.

Confirmed A's route. `reconcile.js:32-45`: `wiped` is only the obligations that
carry `wipeOnExit` **and** are out of scope **and** are answered. An out-of-scope
obligation *without* `wipeOnExit` keeps its value in `answers`; `valueAt` re-reads
it on the next in-scope render → pre-filled. Genuine.

But A never exercises it. Every one of the 15 `activatedBy` gate carriers in
`features/*/obligations.js` also carries `wipeOnExit: true` — verified by grep
(import-purpose:6-7, transport ×3 at 20/24, 32/36, 42/46, additional-details:9/14,
commodities ×8 at 13/17, 33/34, 39/40, 45/46, 51/52, 70/71, 76/77, 83/84,
origin:15/16, cph-number:7/12). So on A's own side the capability is *unbuilt* —
the model merely *could* express it by omitting a flag that is, in fact, never
omitted on a gated obligation. The task's REFUTED clause names exactly this:
"the 'structural' framing is wrong (it is merely unbuilt…)".

### 2. B's running system ALREADY retains out-of-scope values — because the model-specified purge is view-only.

`purgeStorage` (`evaluator.js:333-379`, the unconditional `if (!isInScope) continue`
at :346) produces `amendedFulfilments`, and `evaluate` returns it (:123-126). But
nothing persists it. `readState` (`lib/state.js:42-44`) computes it and the
controllers throw it away. Every mutator reads and writes **raw yar**, never the
amended map: `writeAnswer` (`state.js:51, 76`), `addCommodityLine` (`:102, 115`),
`deleteCommodityLine` (`:121`). This confirms L2-session-state.md:17.

Consequence for this exact capability: a value entered on an obligation whose gate
later closes sits **untouched in raw yar** while the obligation is out of scope
(not rendered). When the gate reopens, `readFulfilments` returns it, `evaluate`
keeps it (now in scope), and the field renders pre-filled. **B's deployed
behaviour today IS retain-while-hidden** — as a side effect of the purge never
reaching storage. "B cannot express it at all" is false at the behaviour level.

(Caveat, stated honestly: this is an accident of an incomplete write-back, not a
modelled choice. The doc claims the opposite — `obligations.md:2039-2040`. A
third-option merge that fixes the write-back — L2:84 — would re-lose it and face
the opt-out decision squarely. So the fix belongs on the shopping list; but that
makes it a small piece of work, not a structural incapacity.)

### 3. Even at the pure-model level, closing it is a small extension — the dimension owner already ruled it non-structural.

`purgeStorage` is a single dispatch keyed off `category` after one guard
(`evaluator.js:346`). Adding retention is one new obligation key consulted in one
branch:

```js
if (!isInScope(obligation)) {
  if (obligation.retainOnExit) amendedFulfilments[obligationId] = fulfilment
  continue
}
```

For a `single`/`field` top-level obligation this is clean and complete — exactly
the "field" the capability describes. This is the "new predicate in an existing
dispatch table" that the task defines as NON-structural.

The L2 author who owns this dimension reached the identical conclusion and
**deliberately excluded it from `aOnly`**: *"I have kept it out of aOnly because
for non-group obligations it is a two-line change to purgeStorage, and the strict
bar is 'structurally cannot'"* (`L2-session-state.md:41`). Asym-14 reintroduces a
claim its own source material already ruled down.

### The one genuinely asymmetric residue (fold into the third option, do not score as structural).

The real, narrow difference is **default polarity**, not capability:
- A's model: retention is the DEFAULT; wipe is opt-in (`wipeOnExit`, present on
  15/44, absent on 29/44). Retain-while-hidden costs zero model change.
- B's model: purge is UNIVERSAL; no opt-out key exists. Retain-while-hidden costs
  one new key + one branch.

"A needs nothing, B needs a two-line extension" is a small-extension asymmetry,
which the task classes as REFUTED, not a structural one.

### The honest wrinkle that narrows the "trivial" claim (but does not rescue "structural").

For a leaf **nested under a group**, a retained out-of-scope leaf would resurrect
its group instance: `enumerateGroupFulfilmentIds` runs POST-purge on
`amendedFulfilments` and infers instance existence from surviving composite-key
prefixes (`evaluator.js:390-421`). So the opt-out is only strictly two lines for
non-group obligations; a group-nested retention needs the resurrection suppressed
too. This makes the extension *slightly* larger than "two lines" in the general
case — an argument for AMENDED-flavour precision — but the capability as claimed
is a scalar field, and B's *behavioural* retention (ground #2) already exists
regardless. The structural claim does not survive either way.

## Bottom line for the third option

Not an A-only structural capability. Shopping-list item: **when B's write-back is
fixed (which the merge must do), add a `retainOnExit` opt-out to `purgeStorage`
(one key + one branch; suppress group-instance resurrection for group-nested
leaves).** A gets the same expressivity for free by keeping wipe opt-in. Both
converge on "purge is per-obligation opt-in/opt-out," which is the single design
decision to make, not an incomparability.
