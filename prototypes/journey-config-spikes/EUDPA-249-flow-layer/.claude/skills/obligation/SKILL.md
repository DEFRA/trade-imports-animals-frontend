---
name: obligation
description: 'Author or extend the EUDPA-249 obligation model. Adds a new obligation (top-level scalar, conditional-scope scalar, records-shape group, or invariant-carrier container), wires its domain entry, declares any group invariants (minEntries / maxEntries / anyOfIds / allOrNothingOfIds / recordCountEquals), keeps the coverage test honest, and regenerates MODEL.md. Handles the OBLIGATION LAYER ONLY — obligations/obligations.js, domain/index.js, obligations/helpers.js, obligations/coverage.test.js, obligations/evaluator.test.js, engine/index.js (invariants only), MODEL.md. Does NOT touch flow.js, features/, routes.js, lib/state.js, lib/presentation.js, or locales/en.json — those belong to the journey / UX layer Sam is building. Use when the user says "add an obligation `<name>`", "wire obligation `<name>`", "make `<field>` mandatory when `<other>` is X", "add a records-shape group for `<domain thing>`", "add invariant `<kind>` to `<group>`", or "extend the obligation model with a new `<kind>` invariant".'
context: fork
allowed-tools: [Bash, Read, Edit, Write, Glob, Grep]
---

Obligation-model authoring for the EUDPA-249 flow-layer spike.

## Scope boundary

**In scope** — anything that touches:

- `obligations/obligations.js` — the manifest
- `obligations/helpers.js` — gate helpers + `obligationMetadata`
- `obligations/coverage.test.js` — `KNOWN_UNWIRED` bookkeeping
- `obligations/evaluator.test.js` — scope + purge tests
- `domain/index.js` — legal-value domain entries
- `engine/index.js` — but ONLY the `groupInvariantErrors` primitive (new invariant kinds)
- `engine/index.test.js` — invariant tests
- `MODEL.md` — regenerated via `npm run docs:model`

**Out of scope** — do not modify:

- `flow/flow.js`, `features/**`, `routes.js`, `lib/state.js`,
  `lib/presentation.js`, `locales/en.json` presentation copy, page
  controllers, Playwright walks — these belong to the journey / UX
  layer Sam is building on top of the obligation model. If the user
  asks for something that requires touching these files, STOP and
  flag the boundary explicitly rather than silently doing it. They
  may still want the obligation-side changes; land those and hand off
  the journey-side work.

## Workflow

Nine steps from a spec fragment to a landed obligation-side commit.

### 1. Confirm the spec fragment

Read whatever the user gave you — a Confluence URL, a Jira ticket, a
paste of a spec row. If it's a URL, fetch via
`tools/confluence/page.sh` (Confluence) or `tools/jira/ticket.sh`
(Jira). Distil the row into a one-line target: "add `<name>` — spec
says: `<one-sentence summary>`".

### 2. Pick the obligation shape

Walk the decision tree in [`references/pick-a-shape.md`](./references/pick-a-shape.md).
Confirm the shape with the user before writing code — the shape
decision is the load-bearing bit. Common outputs:

- **Notification-level scalar, always in scope** — `{ id, name, status }`.
- **Notification-level scalar with conditional scope** — carries
  `applyTo` from a gate helper (equalsGate / includesGate / presentGate).
  Decide purge-on-flip vs retain-value.
- **Line-scoped scalar** (`within: commodityLine` or `within:
unitRecord`) — same as notification-level but keyed per record.
- **Records-shape user-driven group** — new indexed group.
- **Invariant-carrier container** — no value; only carries a
  `requires.*` invariant across scalar members.

### 3. Declare the obligation

Add to `obligations/obligations.js`:

- Pick a stable v4 UUID (`uuidgen` on macOS or a fresh one from any
  UUID generator).
- Match the shape from step 2. Manifest declaration order matters —
  a member obligation's `within` reference must be declared after its
  parent (parent obligations come earlier in the file so their `id`
  is bound at declaration).
- Add the export to the `export const obligations = [...]` array at
  the bottom.
- If it's a records-shape group, note that a bespoke summary/add/
  delete controller is needed too — but that's Sam's journey layer,
  out of scope for this skill.

For gate helpers see [`references/pick-a-shape.md`](./references/pick-a-shape.md)
§3 and the meta-first-vs-branchedGate rule in §Rails below.

### 4. Wire the domain entry

Add to `domain/index.js`:

- Import the obligation.
- Declare its domain entry. Match the spec's data type against the
  factory table in [`references/add-an-obligation.md`](./references/add-an-obligation.md#the-checklist)
  — `staticEnum` / `computedEnum` / `predicate` / composite /
  `addressBlock`.
- Register the entry in the `export const domain = new Map([...])`
  map at the bottom.

If the obligation is a structural container carrying only a
`requires.*` invariant, it has no domain entry and must instead be
added to `KNOWN_UNWIRED` in `obligations/coverage.test.js` (see step
6).

### 5. Wire any group invariants

If the shape from step 2 involves a group-level rule:

- Reference [`references/invariants.md`](./references/invariants.md) for the
  five kinds and their copy-paste shapes.
- Attach `requires.*` to the group obligation (never to a member
  field).
- If introducing a **new** invariant kind (a sixth), extend
  `groupInvariantErrors` in `engine/index.js`, update the docstring
  to enumerate all supported kinds, and consider whether MODEL.md's
  dependency graph should render a dotted `-.->` edge for it.

### 6. Update coverage

`obligations/coverage.test.js` will fire if the new obligation lacks
both a domain entry and a `KNOWN_UNWIRED` entry.

- If the obligation has a domain entry (step 4), nothing further to
  do — the coverage test passes automatically.
- If the obligation is a structural container (no domain entry by
  design), add its `name` to `KNOWN_UNWIRED` with a comment
  explaining why (e.g. `// invariant-carrier — no value; requires.*
only`).

Also verify the manifest export order and that no cycle exists in
`within` chains (`coverage.test.js` has a check for both).

### 7. Add tests

Two levels:

- **Evaluator test** in `obligations/evaluator.test.js` — one
  `describe` block covering scope + status + (if applicable) purge-
  on-flip. Match the shape of existing tests for similar obligations
  — see the `purposeInInternalMarket` describe for the
  conditional-scope pattern, `destinationCountry` describe (WS1) for
  the `includesGate` pattern, `accompanyingDocument` describes (WS4)
  for the records-shape pattern.
- **Engine invariant test** in `engine/index.test.js` — only if
  step 5 introduced a new invariant kind. Cases: blank / satisfied /
  composes-with-others / out-of-scope. Mirror the existing
  `minEntries` / `maxEntries` / `anyOfIds` / `recordCountEquals`
  describes.

Run the suite:

```bash
TZ=UTC npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/obligations prototypes/journey-config-spikes/EUDPA-249-flow-layer/engine prototypes/journey-config-spikes/EUDPA-249-flow-layer/domain
```

### 8. Regenerate MODEL.md

```bash
npm run docs:model
```

Verify the new row / edge appears. The MODEL.md staleness test fires
on commit if you skip this step.

### 9. Handoff to the journey layer

Explicitly state what the user still needs to do OUTSIDE the
obligation layer to make the field visible in the UI. Even if Sam is
building the new journey model, articulate the wiring points he needs
to hook:

- Presentation copy (i18n keys, page titles, legends, hints)
- Flow entry (which section/subsection presents this obligation)
- `mandatoryToProceed` semantics if the user must not save-and-
  continue with a blank field
- Records-shape groups: summary/add/delete controller + per-record
  page controller + routes + state helpers

Do not silently create any of this. Reference [`references/worked-examples.md`](./references/worked-examples.md)
if the user wants the full end-to-end pattern from WS1-WS4 — the
Meta-pattern §12-step recipe is the checklist.

## Rails

- **Prefer meta-first helpers** (`equalsGate` / `includesGate` /
  `presentGate`) over `branchedGate`. The meta-first helpers attach
  metadata used by the reachability prover and by `dependsOn`
  derivation. If you reach for `branchedGate`, add `predicateMeta`
  so the prover isn't blind.
- **Purge-on-flip vs retain-value** — pick based on spec language.
  If the spec says the value is meaningless off the gate,
  purge-on-flip (`whenFalse = { inScope: false }`). If the spec says
  the field survives, retain-value (`whenFalse = { inScope: true,
status: 'optional' }`).
- **Rollup-only invariants, not silent purges.** For cross-field or
  cross-record rules (allOrNothingOfIds, recordCountEquals,
  maxEntries), let the invariant fire at rollup so the user
  reconciles the mismatch. Auto-purge silently loses data.
- **One commit per obligation wire-up.** Keeps diffs reviewable.
- **Regenerate MODEL.md before commit.** The staleness test
  (`docs/generate-model.test.js`) fires otherwise.
- **Do NOT touch the journey layer.** See scope boundary above. If
  the request requires it, STOP and flag; do not silently reach into
  flow.js or features/.
- **Bash call hygiene** — one command per Bash call.

## Reference material

Everything the skill needs is copied into `references/`:

- [`references/pick-a-shape.md`](./references/pick-a-shape.md) — decision
  tree for turning a spec row into the right shape.
- [`references/invariants.md`](./references/invariants.md) — the five
  group-invariant kinds with copy-paste shapes.
- [`references/add-an-obligation.md`](./references/add-an-obligation.md) —
  the wire-up checklist (obligation-side only — presentation / flow
  steps are informational, out of scope for this skill).
- [`references/worked-examples.md`](./references/worked-examples.md) —
  index of the four WS1-WS4 workstreams as canonical shapes + the
  12-step meta-pattern PR checklist. Useful when the user wants the
  full end-to-end pattern rather than just the obligation-side wire-
  up.

## What NOT to do

- Do NOT modify `flow/flow.js`, `features/`, `routes.js`,
  `lib/state.js`, `lib/presentation.js`, or `locales/en.json`.
  Explicitly out of scope. Flag and hand off.
- Do NOT invent a new gate helper without extending
  `obligations/helper-internals.js` + `analysis/reachability.js`'s
  helper-type registry. If the existing helpers can't express the
  rule, that's an architecture change, not a routine obligation add
  — surface it explicitly.
- Do NOT skip the domain entry. Coverage test blocks the PR.
- Do NOT skip the MODEL.md regenerate. Staleness test blocks the
  PR.

## Graduation from spike (post-EUDPA-288)

This skill lives inside the spike so that changes to the model, the
docs, and the skill land in one repo / one PR. When the obligation
model graduates from the spike to production (or is adopted by
Sam's new journey model at a stable location), the skill should
move so it's discoverable across the whole workspace rather than
only when working under the spike dir.

**To-do at graduation:**

1. Move the skill directory to the workspace level:

   ```
   ~/git/defra/trade-imports-animals-workspace/.claude/skills/obligation/
   ```

   `git mv` the whole tree
   (`SKILL.md` + `references/`).

2. Update `SKILL.md`'s file-path references (workflow steps 3-8)
   from spike-relative paths (`obligations/obligations.js`,
   `domain/index.js`, etc.) to the new canonical locations.

3. Update `references/*.md` — the "CANONICAL:" comment at the top
   of each copy needs its path bumped; the copied docs' own
   in-body relative links may need re-anchoring.

4. Add the skill to the workspace routing table in
   [`~/git/defra/trade-imports-animals-workspace/CLAUDE.md`](../../../../../../../CLAUDE.md).
   One-line entry, matching the existing format
   (`| \`obligation\` | "add an obligation `<name>`", "wire
   obligation `<name>`", "make `<field>` mandatory when `<other>`
   is X", "add a records-shape group for `<domain thing>`", "add
   invariant `<kind>` to `<group>`", "extend the obligation model
   with a new `<kind>` invariant" | Author or extend the
   obligation model … |`).

5. Update the nested `obligations/CLAUDE.md` nudge (if the
   `obligations/` directory itself moves with graduation) — or
   remove it if the directory is retired.

6. Verify the skill still auto-discovers by running Claude in a
   fresh cwd anywhere in the workspace and confirming the trigger
   phrases route.

Deliberately keeping this as a to-do rather than pre-writing the
workspace CLAUDE.md entry — the workspace repo is separate from the
frontend repo where the skill currently lives, and cross-repo
commits are messier than a single graduation PR when the time comes.
