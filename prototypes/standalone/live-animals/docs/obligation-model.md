# The obligation model

An obligation is a small data record that says "the journey owes this
answer". Every feature declares its own obligations in a pure
`features/<feature>/obligations.js` file. The engine reads those
declarations to work out scope, wiping, completeness and status — it
never reads a page, a template or a validator.

All file paths in this document are relative to the spike root
(`prototypes/standalone/live-animals/`).

## What an obligation carries

An obligation is a plain object with at most these fields:

| Field                | Kind         | Meaning                                                                                                             |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `id`                 | identity     | The obligation's name. Also the key in the answers map and the DOM field name — one string, three roles.            |
| `required`           | mandate      | This answer is owed before the obligation counts as complete.                                                       |
| `requiredAtLeastOne` | mandate      | A collection owes at least one entry (only meaningful with `collection: true`).                                     |
| `collection`         | structure    | This obligation is a repeating list. Its `item` array holds the sub-obligations of each entry.                      |
| `item`               | structure    | Real nested obligation definitions — not field-name strings (see [collections](#collections-are-a-recursive-tree)). |
| `system`             | structure    | Computed on demand, never collected or stored (see [system and renderOnly](#system-and-renderonly-flags)).          |
| `renderOnly`         | structure    | Presented on a page but never committed to the store.                                                               |
| `activatedBy`        | relationship | A predicate over another obligation's answer. When it holds, this obligation is in scope.                           |
| `wipeOnExit`         | relationship | When this obligation leaves scope, destroy its stored answer.                                                       |

That is the whole vocabulary. Because `id` doubles as the store key and
the DOM field name, a definition, its stored answer and its form input
always line up — there is no mapping layer to drift.

### Why so thin

There is deliberately no `type`, no copy, no widget choice and no
validation on an obligation. The v1 model carried all of those, and a
usage trace during the rebuild found that no runtime code read them —
every widget, label and value domain was already re-declared in the
page templates and controllers. So v2 dropped the dead copies: pages
own presentation, controllers own validation, and the model keeps only
the facts the engine actually evaluates.

## required means owed, not save-blocking

`required: true` is a completion fact: the status roll-up reads it to
decide whether a section is fulfilled. It does not stop a user saving a
blank form. Save-blocking rules are a controller concern, written as
validators — the journey's only hard mandate is `countryOfOrigin`,
expressed as a `requiredText` rule in `features/origin/controller.js`,
not as an obligation flag.

See [validation.md](validation.md) for the validation seam.

## The purity contract

An `obligations.js` file imports nothing outward — no view, request,
controller, engine, validator or config. The only import it may make is
sideways, to another feature's `obligations.js`, when a relationship
references an obligation owned elsewhere.

The rule is enforced at boot. `routes.js` calls
`assertObligationPurity()` (in `obligation-purity.js`), which reads the
source text of every `features/<feature>/obligations.js` and rejects
any import specifier that is not another `obligations.js`. The server
does not start if the model has been re-coupled to presentation.

It scans source text rather than the module graph on purpose:

- a text scan catches a forbidden import even in a feature the
  registry barrel forgot to assemble
- it needs no runtime resolution of the offending module — the check
  cannot itself be broken by the import it is trying to reject

## Cross-feature references form a DAG

When one feature's obligation is activated by another feature's answer,
the reference is a real JS import of the obligation constant — never a
string or an id lookup. The current edges:

- `claims` ← `hadClaims` (driving-history)
- `drivers` (named-driver) ← `addons`
- `modDescription`, `modValue` (modifications) ← `addons`
- `ncdYears` (protected-ncd) ← `addons`
- `premium` (quote) ← `coverType` (cover-type)

Activation always flows from a controlling answer to the details it
unlocks, so the graph is acyclic.

Real references buy three things over the UUIDs the v1 model used:

- **greppable** — search for `hadClaims` and you find the definition
  and every relationship that depends on it
- **navigable** — editors jump straight from the reference to the
  definition
- **fail-loud** — a misspelt import throws when the module loads; a
  misspelt UUID silently matches nothing

## The activation vocabulary

`activatedBy` is a data literal over an obligation reference — never a
closure. There are exactly three operators, interpreted in one place
(`engine/evaluate/predicate.js`):

```js
{ obligation: hadClaims, equals: 'yes' }          // scalar equality
{ obligation: addons, includes: 'named-driver' }  // membership in a multi-select
{ obligation: coverType, present: true }          // answered (non-blank)
```

`includes` also accepts a list target — set intersection, so a scalar
answer reads "is one of these" (the number-of-packages commodity list in
`features/commodities/obligations.js`):

```js
{ obligation: commoditySelection, includes: PACKAGE_COUNT_COMMODITIES }
```

The vocabulary is deliberately small. It covers "this answer unlocks
that obligation" and nothing more. Anything that needs real branching —
arithmetic, multi-condition logic, external state — belongs in a page
controller. That is the pressure valve: the model stays declarative
because controllers absorb the cases it refuses to express.

## Collections are a recursive tree

A repeating list is a first-class obligation: `collection: true` plus
an `item` array of real sub-obligation definitions. From
`features/claims/obligations.js`:

```js
export const claims = {
  id: 'claims',
  collection: true,
  item: [claimType, claimAmount, windscreenProvider],
  activatedBy: { obligation: hadClaims, equals: 'yes' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}
```

Because the items are real obligations, the engine sees them:
per-instance scope, per-instance wipe, per-item completeness and
dispatch coverage all descend into the item. Nesting is literal — a
collection's item can contain another collection, and the named-driver
feature reaches depth 2 (`drivers[i].claims[j].claimType`).

Sub-obligation ids are frame-relative: `claimType`, not
`claims.claimType`. The id is the key inside each entry object
(`answers.claims[0].claimType`) and the DOM field name — the same
three-roles-one-string rule as at the root, just relative to the entry.

One aliasing note: the nested driver claims collection
(`driverClaims` in `features/named-driver/obligations.js`) and the
top-level claims collection both have the id `claims`. They are
distinct obligations at distinct template addresses — `drivers.claims`
and `claims`. Do not "deduplicate" them: sharing the id is what keeps
the nested form's field names identical, while the definitions stay
independent.

## Item-relative predicates

A sub-obligation can be gated on a sibling field within the same entry.
From `features/claims/obligations.js`:

```js
export const windscreenProvider = {
  id: 'windscreenProvider',
  required: true,
  activatedBy: { obligation: claimType, equals: 'windscreen' },
  wipeOnExit: true
}
```

Nothing in the literal says "item-relative". Resolution is inferred
from sibling identity: if the referenced obligation is one of the
current node's siblings (the same `item` list it was walked from), the
reference resolves inside this entry's frame; otherwise it is a
top-level answer. The same literal works at any depth, with no marker
and no extra operator.

Two resolvers apply this rule and must not diverge:

- `evalPredicate` in `engine/evaluate/predicate.js` — decides scope
  during reconcile
- `entryComplete` in `engine/evaluate/complete.js` — decides whether
  an entry is complete

Both use the identical criterion, `siblings.includes(ref)`. That is the
resolver-unity invariant: an obligation reconcile puts in scope is the
same one completeness counts as owed. One asymmetry is deliberate — a
sub-obligation gated on a non-sibling cannot be resolved from inside
the entry, so `entryComplete` treats it as owed. Conservative: the
engine may ask for an answer it did not strictly need, but it never
reports an entry complete when it is not.

## system and renderOnly flags

Two flags mark obligations that exist in the model but not in the
answers map:

- **`system`** — computed on demand, never collected or stored. The
  only one is `premium` (`features/quote/obligations.js`): the quote
  controller calls `calculatePremium` on the current answers every
  time the page renders. `kit.collectsFrom` filters `system`
  obligations out of every page's `collects`, and the boot coverage
  assertion in `flow/dispatch.js` skips them — no page owns them.
- **`renderOnly`** — presented on a page but never committed: the
  input renders, but the controller never writes it. Unlike `system`
  obligations it stays in the page's `collects` (the presenting page
  owns it), and the commit contract test (`contract.test.js`)
  excludes it from the "committed equals collects" check. No current
  obligation carries the flag; the contract stands ready for one that
  does.

Both flags enforce the same principle: nothing derived or decorative is
ever stored. See the persistence documentation for the wider
"nothing derived is stored" invariant.

## registry.js assembles, never defines

`registry.js` imports every feature's `obligations.js` and concatenates
them. No obligation is born in the barrel — relationships are authored
in the feature files, and the barrel is a pure assembly point.

Its surfaces, and who consumes each:

| Surface                         | What it is                                                                                                                                                                                                               | Consumers                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `registry.all`                  | Every root obligation, flat, in flow order                                                                                                                                                                               | the commit contract test (`contract.test.js`) iterates it                                                          |
| `registry.byId(id)`             | Root id → obligation                                                                                                                                                                                                     | `engine/status.js` and `engine/evaluate/complete.js` (status and completeness look-ups)                            |
| `registry.byPath(templatePath)` | Index-free dotted address → obligation, at any depth (`claims.claimType`)                                                                                                                                                | `engine/evaluate/collection-view.js`                                                                               |
| `walkObligations()`             | The full structural catalogue — every obligation at every depth, independent of any answers; yields `{ templatePath, obligation }`                                                                                       | `flow/dispatch.js` (`buildDispatch` coverage-asserts every non-system obligation is collected by exactly one page) |
| `walk(answers)`                 | The per-instance catalogue — the tree materialised against a concrete answers map, one yield per stored collection entry; also yields the frame facts (`collectionAncestorKey`, `framePath`, `siblings`) reconcile needs | `engine/evaluate/reconcile.js`                                                                                     |

The split between the last two matters: `walkObligations` answers
"what can the model ever owe?" (boot-time coverage), while
`walk(answers)` answers "what does the model owe right now, instance by
instance?" (every reconcile).
