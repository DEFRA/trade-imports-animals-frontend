# obligations/ — obligation-model authoring

Editing files here almost always means authoring or extending an
obligation. There's a dedicated skill that walks the decision tree
and rails:

**Skill:** [`.claude/skills/obligation/SKILL.md`](../.claude/skills/obligation/SKILL.md)

**When to use it:** any of these phrases from the user should route
you into that skill —

- "add an obligation `<name>`"
- "wire obligation `<name>`"
- "make `<field>` mandatory when `<other>` is X"
- "add a records-shape group for `<domain thing>`"
- "add invariant `<kind>` to `<group>`"
- "extend the obligation model with a new `<kind>` invariant"

Even without the phrase, if you're editing `obligations.js`,
`helpers.js`, or `coverage.test.js`, the skill's decision tree +
rails are the fastest path to a clean change.

**Reference docs** (canonical) live in [`../docs/`](../docs/):

- [`pick-a-shape.md`](../docs/pick-a-shape.md) — decision tree.
- [`invariants.md`](../docs/invariants.md) — the five
  `groupInvariantErrors` kinds.
- [`worked-examples.md`](../docs/worked-examples.md) — WS1-WS4 as
  canonical shapes + the 12-step meta-pattern PR checklist.
- [`add-an-obligation.md`](../docs/add-an-obligation.md) — the
  wire-up checklist.

## Scope boundary

The obligation model is **notation for what to ask, when, and with
what value semantics**. It does NOT own the UX / journey layer.

If a change here would only take effect once you also modify
`flow.js`, `features/`, `routes.js`, `lib/state.js`,
`lib/presentation.js`, or `locales/en.json` — surface that
explicitly. The obligation-side change can still land; the journey-
side wiring belongs to the journey model (currently the flow-layer
spike; will be Sam's new journey model when that lands).
