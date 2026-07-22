# How to add an obligation to the V4 journey

Adding a new V4 field to the browsable prototype is a fixed sequence
of ~6 file edits. This doc is the checklist. Skip a step and either
tests fail or the field never appears in the UI — both loud enough to
catch the omission.

Historical worked examples (iterations 1-10 from the initial V4
buildout, plus refinement notes) lived in this doc through commit
`2e9bf7b`. They're preserved in git history but removed here — for
current worked examples of the four canonical shapes see
[`worked-examples.md`](./worked-examples.md).

## Prerequisites

- The obligation you want to add is already declared in
  [`obligations/obligations.js`](../obligations/obligations.js). This
  is almost always true — the parent EUDPA-277 spike declared ~42 V4
  obligations. If yours isn't there, add it (its own mini-checklist
  below in "Adding a brand-new obligation").
- The obligation is on the `KNOWN_UNWIRED` allow-list in
  [`obligations/coverage.test.js`](../obligations/coverage.test.js).
  You'll remove it at the end.

## The checklist

**Which flow are you in?** This checklist covers **wiring an existing
obligation** (small change — domain entry, presentation copy, flow
entry). If you're **extending the model** (new invariant kind, new
records-shape group, new gate helper, new domain factory), use the
end-to-end pattern in
[`worked-examples.md` §Meta-pattern](./worked-examples.md#meta-pattern-how-each-pr-was-structured)
instead — that's the twelve-step recipe WS1-WS4 followed. For the
initial "which shape am I dealing with?" decision, see
[`pick-a-shape.md`](./pick-a-shape.md).

**Note on no-ops.** Steps 3 (presentation) and 4 (flow) can each be
no-ops. The initial spike shipped presentation copy for every V4
obligation, so if the copy is already accurate, step 3 is just a
verification. And if the obligation is already presented on an
existing page (this is common — the parent spike's `flow.js` presents
several obligations that don't have domain entries yet), step 4 is
also a no-op. In both cases, do the check, don't invent work.

1. **Confirm the obligation.** Look it up in `obligations/obligations.js`.
   Note the shape: is it a top-level singleton (`applyTo` at the
   root), is it `within: commodityLine` or `within: unitRecord`
   (group-scoped), does it have `applyTo` at all (structural groups
   don't)? The answer decides which factory you use in step 2. Also
   check whether the obligation is already presented on a page in
   `flow/flow.js` — if so, step 4 is a no-op.

2. **Add a domain entry** in
   [`domain/index.js`](../domain/index.js). Two edits in the same file:
   1. **Import the obligation** at the top of the file — add its name
      to the `import { ... } from '../obligations/obligations.js'`
      block.
   2. **Declare the domain entry.** One entry per obligation, keyed by
      the obligation's id. The factory you pick depends on the
      obligation's V4 semantics:

   | V4 shape                                        | Factory                                   | Example                   |
   | ----------------------------------------------- | ----------------------------------------- | ------------------------- |
   | Yes/No or small closed enum                     | `staticEnum(options, { labels })`         | `containsUnweanedAnimals` |
   | Enum whose options depend on another obligation | `computedEnum(fn, readsFrom, { labels })` | `purposeInInternalMarket` |
   | String / integer / date rule                    | `predicate(type, fn, reasons)`            | `internalReferenceNumber` |
   | Composite (enum + predicate on the same field)  | Build inline                              | `transitedCountries`      |

   Register the entry in the `export const domain = new Map([...])`
   list at the bottom of the file.

   **If the entry has a `labels` map** (enum shapes), its values are
   message keys, not literal strings. Follow the convention
   `domain.<bucket>.<code>` where `<bucket>` is the enum concept:
   `domain.country.*`, `domain.species.*`, `domain.yesNo.*`, etc.
   Reuse an existing bucket when the same codes appear across
   obligations (e.g. `regionCodeRequirement` and
   `containsUnweanedAnimals` both use `domain.yesNo.*`). See step 3
   for adding the actual English strings.

3. **Add presentation copy** to `locales/en.json` and register keys
   in [`lib/presentation.js`](../lib/presentation.js).
   1. **In `locales/en.json`:** add a bucket under `presentation.`
      keyed by the obligation's `name` (camelCase):

      ```json
      "presentation": {
        "myObligation": {
          "pageTitle": "My obligation",
          "legend": "How do you want to describe it?",
          "hint": "Optional guidance under the legend."
        }
      }
      ```

      Omit the `hint` key entirely if the field has no hint (rather
      than `null`).

      If step 2 added a `labels` map, also add the English strings
      under the matching `domain.<bucket>.*` bucket in en.json.

   2. **In `lib/presentation.js`:** import the obligation, then add
      an entry to `OBLIGATION_KEYS` that stores the keys, not literal
      strings:

      ```js
      ;[
        myObligation.id,
        {
          pageTitleKey: 'presentation.myObligation.pageTitle',
          legendKey: 'presentation.myObligation.legend',
          hintKey: 'presentation.myObligation.hint' // omit if no hint
        }
      ]
      ```

      Consumers (page-controller, CYA, widget builders) resolve via
      `t()` — you don't touch them.

   3. **`i18n-coverage.test.js` will fail** if any key referenced
      from flow.js, presentation.js, or the domain manifest is
      missing from en.json. Read the failure list, fix en.json.
      Missing keys also render as their raw dotted-path in the
      browser (visible red flag) so a manual walk catches them too.

4. **Present the obligation on a page** in
   [`flow/flow.js`](../flow/flow.js). Same two-edit pattern: import at
   the top of the file, then either:
   - Add a `presents` entry to an existing page, OR
   - Add a new page. If the obligation is a natural section-opener
     (e.g. one page for one obligation), add a new subsection with a
     single-page child. See the existing pages for shape.

   If you add a **new section or subsection**, its `titleKey` field
   must reference `flow.section.<id>.title` or
   `flow.subsection.<id>.title` and en.json must carry the copy.

   `mandatoryToProceed` on the presents entry is separate from
   the obligation's engine-level `status`. Default is `false` — the
   page validates against the domain but doesn't block save-and-
   continue on a blank submission. Set it to `true` (with a paired
   `errors.<obligationName>.required` message KEY under
   `errors: { required: 'errors.myObligation.required' }`, and the
   English string in en.json) when this specific page must not
   advance without an answer. See §Making a field mandatory-to-save-
   and-continue below for the full story.

5. **Remove from `KNOWN_UNWIRED`** in
   [`obligations/coverage.test.js`](../obligations/coverage.test.js).
   Simply delete the name from the set. The `coverage.test.js` suite
   should still pass — if not, either the domain entry is missing or
   the obligation is on the list under a wrong name.

6. **Update snapshot fixtures if needed** in
   [`fixtures/`](../fixtures/). The `dump.test.js` snapshots stringify
   the model state; new pages / new obligations change the shape.
   Run `npx vitest run dump.test.js` and update the snapshot if the
   diff is intentional.

7. **Run the full test suite.**

   ```bash
   npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/
   ```

   Expected: green if the obligation is late in the flow (no earlier
   assertion is invalidated); several failures if the obligation lands
   early. Common failures and fixes:
   - **`nextAfter` / redirect assertions** — a page inserted between
     two existing ones changes `nextAfter(<earlier>)`. Update the
     assertion to point at the new page.
   - **Subsection / section status roll-up** — see §Status alphabet
     below for the full 5-way rule. Quick summary for a fixture
     landing on this step: adding a MANDATORY obligation typically
     requires a fixture value or the roll-up drops F → NS/IP; adding
     an OPTIONAL obligation to a subsection that already has any
     mandatory concern does not change the roll-up; adding an OPTIONAL
     obligation to a purely-optional subsection means the subsection
     will read "Optional" until the user fills something (rather than
     the old vacuous F).
   - **`firstUnfulfilledPage`** — the descent order changed.
   - **`dump.test.js` snapshots** — fixtures under `fixtures/` need
     matching values for the new obligation. Update the fixture, not
     just the assertion.
   - **`KNOWN_UNWIRED` orphan-check** — if step 5 was skipped, the
     coverage test fires with a clear "missing" message.

8. **Manual walk in the browser.**

   ```bash
   npm run dev
   # http://localhost:3000/prototype/eudpa-249/start
   ```

   Click through. The new page should appear at the expected point in
   the flow. Fill it, save-and-continue, ensure it reaches CYA and
   shows the value there with a working Change link.

9. **Commit atomically.** One commit per obligation wire-up:

   ```
   feat(EUDPA-249): add <obligationName>
   ```

## Adding a brand-new obligation

This case is rarer than "wire an existing obligation" — usually the
V4 obligation already exists in `obligations/obligations.js`. If it
doesn't:

1. Pick a stable UUID (any valid v4 UUID — `uuidgen` on macOS works).
2. Choose the shape:
   - Top-level singleton with an `applyTo` returning `{ inScope, status,
reasons? }`.
   - `within: commodityLine` for a line-scoped field with `status`.
   - `within: unitRecord` for a unit-scoped field.
   - `applyTo` using an allow-list helper if the scope depends on
     another obligation's value.
3. Add to the `export const obligations = [ ... ]` list at the bottom
   of `obligations/obligations.js`.
4. Then follow the standard checklist above.

Note: `obligations/coverage.test.js` will fire immediately with an
"obligation lacks domain and allow-list entry" error until you wire
it. That's the correct catch — it's why we added that test.

## Making a field mandatory-to-save-and-continue

Two orthogonal mandate concepts exist in the model, so it's worth
being explicit which one you want when adding an obligation:

- **Completion-mandate** — does the _journey_ need this filled to
  reach F? Set on the obligation itself, via `status: 'mandatory' |
'optional'` (top-level or via `applyTo`). Enforced by
  `pageStatus`/`containerStatus`/`journeyState`.
- **Submit-mandate** — must the _user_ fill this before hitting Save
  and continue on this page? Set on the flow-entry, via
  `mandatoryToProceed: true`. Default false — leaving the
  field blank on POST validates through and redirects on. When true,
  a blank POST returns a 400 with the flow-supplied required
  message; the domain check runs on non-blank input as normal.
  For **address (composite) obligations**, the gate consults
  `domainEntry.isComplete(value)` rather than just checking blank —
  so a partial address (some required sub-fields blank) also fails
  the gate, matching the V4 "Mandatory to proceed" semantic that
  "the whole page must be complete." See `contract.js`
  `isSufficientForProceed` and the audit finding cluster #7-9.

The two are independent. A field can be:

|                  | completion-optional                                                                                 | completion-mandatory                       |
| ---------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| submit-optional  | fill any time, or not at all (e.g. internal reference)                                              | fill any time — journey blocks at F rollup |
| submit-mandatory | must fill _here_, can be blank as far as F cares (rare — usually you want completion-mandatory too) | must fill here AND fill somewhere for F    |

### Shape

```js
{
  page: 'country-of-origin',
  presents: [
    {
      obligation: countryOfOrigin,
      mandatoryToProceed: true,
      errors: {
        required: 'errors.countryOfOrigin.required'
      }
    }
  ]
}
```

`errors.required` is a **message key**, resolved via `lib/i18n.js`
(`t(key)` → `locales/en.json`). Add the English string to
`locales/en.json`:

```json
"errors": {
  "countryOfOrigin": {
    "required": "Enter a country of origin"
  }
}
```

Missing keys render as their raw dotted-path in the UI (visible red
flag) and are caught in CI by `i18n-coverage.test.js`.

### When to use it

Reach for `mandatoryToProceed: true` when the UX design says
"the user must not be allowed past this page without a value." Common
cases: journey-driving fields whose value gates every downstream
page's routing (`countryOfOrigin`, `commodityCode`), or safety-
critical inputs that must not be silently blank.

Do NOT reach for it by default. Making every mandatory field
submit-mandatory encourages users to type placeholders to get past
error pages; it also fights the GDS "let people save partial
progress" pattern. Prefer completion-mandate at F-rollup for most
required fields.

## Status alphabet — page, container, journey

Every page, subsection, section, and the journey itself surface a
single derived status through the same 5-way alphabet. The rules are
computed by `classifyEntries` in `engine/index.js` — one classifier
that runs at page level over a single page's presented entries,
at container level over a subtree's collected entries, and at journey
level over every section's entries combined. The alphabet:

| Status         | When it fires                                                             | Task-list tag             |
| :------------- | :------------------------------------------------------------------------ | :------------------------ |
| Not applicable | No obligations are in scope at all.                                       | `govuk-tag--grey`         |
| Not started    | At least one mandatory concern in scope, nothing filled anywhere.         | `govuk-tag--blue`         |
| Optional       | Only optional obligations in scope, none filled.                          | `govuk-tag--turquoise`    |
| In progress    | At least one mandatory concern still unsatisfied, some obligation filled. | `govuk-tag--light-blue`   |
| Complete       | Either only optional in scope and ≥ 1 filled, or every mandatory filled.  | (no tag — GOV.UK default) |

A "mandatory concern" means an in-scope obligation with
`status: 'mandatory'` OR (at container/journey level) any unsatisfied
group-invariant instance from a `presentsForEach.forEachOf.requires`
group (e.g. "≥ 1 identifier per unit-record"). Group errors count
identically to unfilled mandatory obligations for classification.

**Design notes worth being explicit about:**

1. **No visited-plumbing.** "Optional" doesn't need a per-session
   "user visited this page" flag. Engagement is measured by fulfilment
   count, same as everywhere else. A user who visits an Optional page
   and consciously leaves everything blank sees the tag stay Optional.
   Filling any obligation flips it to Complete.
2. **Case classification is dynamic.** Whether a page (or subtree) is
   "only optional" depends on the current fulfilment state via
   `applyTo`. A page declared with 1 mandatory + 3 optional obligations
   whose mandatory falls out of scope is effectively optional-only for
   that render.
3. **Optional pages are skipped by `firstUnfulfilledPage`.** Same as
   Complete pages. The Optional tag surfaces the invitation to visit;
   the `/start` redirect and the Continue affordance don't force it.
   Users reach Optional pages via the task list (or a CYA change link).
4. **Optional at container level only surfaces on purely-optional
   subtrees.** A subsection with any in-scope mandatory anywhere in
   its pages falls into the mandatory-branch of the classifier
   (NS/IP/Complete). This is deliberate: on mixed subsections the
   mandatory work IS the primary story, and the "invitation to add
   more" from an optional sub-page gets absorbed into Complete once
   the mandatory bar is met. Stakeholders asking "why doesn't a mixed
   subsection tell me there's more?" — because "Done" is defined by
   the mandatory bar, not by every field being touched.
5. **The historical "empty-session clamp" is gone.** The old
   `containerStatus` clamped to Not started when nothing had been
   touched — necessary because vacuously-F optional-only children
   would otherwise push a purely-untouched subsection to In progress.
   The 5-way classifier makes this natural: nothing filled + at least
   one mandatory anywhere = NS; nothing filled + only optional = Optional.
   No clamp needed.
6. **Design record.** The status alphabet was expanded from 4 → 5
   values during the P0 UX fix (2026-07-13). Prior to that, an
   untouched optional-only page/subsection read Completed via a
   vacuous match on "no mandatory unfilled" — model-correct but
   confusing on the task list. The Optional tag makes the surface
   read honestly; the underlying invariants (F ⇒ every mandatory
   satisfied) are unchanged.

## Gotchas

_This section accumulates real problems the checklist doesn't catch.
Currently empty._

## What this doc does not cover

- Adding a **new page** without a new obligation (i.e. presenting an
  existing obligation on a new page too). See `docs/add-a-page.md`
  (not yet written).
- Adding a **new subsection** or **new section** as its own
  structural change. Included as a sub-step of the checklist above
  because the two usually happen together.
- Bespoke controllers (features/ folders). Those are for UX flows
  that don't fit the generic form-page pattern — hub, CYA,
  commodity-lines add/list/delete, etc.
