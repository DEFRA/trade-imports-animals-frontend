# L3 — Adversarial verification — mandate-model — C1

**Claim (C1):** A's COMPLETION mandate is genuinely centralised (5 engine reader lines) but its PROCEED
mandate is not enforced by the model at all: `enforcedAt: 'continue'` has exactly one reader, which only
derives flow sequencing, while the actual save-blocking is hand-coded at 4 controller sites — and the
declared-carrier set and the hard-blocked set overlap in exactly ONE field (`countryOfOrigin`).
`importType` hard-blocks while its obligation carries no mandate key at all.

**Verdict: AMENDED.** Every cited line is real. But the two most quotable specifics — "**overlap in exactly
ONE field**" and "**not enforced by the model at all**" — are both false, the site count (4) is an undercount,
and the `importType` jab credits a defect that the spec explicitly rules is not one.

*(This is a second, independent pass over the same claim. It re-derives §§1-5 from source and converges with
the prior pass on the two central refutations. It **overturns the prior pass's §3 reading of `importType` as
"drift"** — see §6 — and adds the `requiredText` finding in §7.)*

A = `clone-live-animals` @ b6ac2ed, root `prototypes/standalone/live-animals/`. Paths relative to that root.

---

## 0. What I searched

- `grep -rn "enforcedAt"` / `"requiredOneOf"` / `"requiredText"` over the whole prototype.
- `grep -rn "pageGatePasses\|sectionGatePasses\|pagePrerequisites\|sectionPrerequisites"` — every consumer of
  the one `enforcedAt` reader, to test whether it is inert.
- Read at source: `engine/status.js`, `engine/evaluate/complete.js`, `flow/prerequisites.js`, `flow/gates.js`,
  `flow/run.js`, `flow/navigation.js`, `features/hub/controller.js:115-155`,
  `features/commodities/search.controller.js:100-144`, `features/commodities/animal-identification.controller.js:452-491`,
  `features/{origin,commodities,declaration,import-type-filter}/obligations.js`, `features/origin/controller.js:20-37`,
  `docs/validation.md:55-94`, `docs/flow-and-gates.md:33-35,107`, `spec/journey-spec.json:1948`, `spec/conflicts.json:216`.

## 1. What survived contact with the source

| Sub-assertion | Status |
|---|---|
| Completion mandate read in ~5 engine lines | **TRUE**, and stronger than claimed (§2) |
| `enforcedAt` has exactly one reader (`flow/prerequisites.js:11`) | **TRUE** — whole-tree grep |
| 2 carriers of `enforcedAt: 'continue'` | **TRUE** — `features/origin/obligations.js:4`, `features/commodities/obligations.js:6` |
| Save-blocking is hand-coded per controller, with **no** assertion/test tying it to the flag | **TRUE** — this is the real defect |
| `docs/validation.md:71-78` is false | **TRUE**, and worse than claimed (§7) |

## 2. Counter-hunt that FAILED — the claim's first half is stronger than stated

Grepped `features/`, `shared/`, `analysis/`, `registry.js`, `obligation-purity.js` for `obligation.required` /
`partRequired` / `isRequiredObligation`: **zero hits outside `engine/`**. Readers are exactly
`engine/status.js:23-24` (`Boolean(obligation?.required || obligation?.requiredAtLeastOne)`),
`engine/evaluate/complete.js:54` (per-item `required`), `:65` (`requiredAtLeastOne` floor), `:15-21`
(`requiredOneOf` group). **Centralisation of the completion mandate: confirmed.**

## 3. Refutation A — the overlap is 2 of 2, not 1

The claim's own cited evidence contradicts its headline. It lists
`features/commodities/search.controller.js:122-128` as a hard-block site but never asks **which field that
block guards**:

```js
if (selected.length === 0) {
  const { journey } = await state.get(request, h)
  return render(request, h, journey, { query, selected, errors: { search: 'Select a commodity' } })
}
```

`selected` → `seedLine` → `{ commoditySelection, speciesSelection, … }` (`:100`). A zero-selection POST
re-renders with an error instead of creating a line. That is a hard save-block on **`commoditySelection`** —
which is carrier #2 of `enforcedAt: 'continue'` (`features/commodities/obligations.js:6`).

| set | members |
|---|---|
| declared `enforcedAt: 'continue'` | `countryOfOrigin`, `commoditySelection` |
| hard-blocked at owning page | `countryOfOrigin`, `commoditySelection`, `importType`, `declaration` (+ §5) |
| **intersection** | **both — i.e. 100% of declared carriers are save-blocked today** |

The declared set is a **strict subset** of the hard-blocked set. "Overlap in exactly ONE field" is only true if
"hard-blocked" is silently narrowed to "blocked *via the Joi `requiredOneOf` primitive*" — a mechanism
distinction, not a mandate one. And it inverts the reader's impression: C1 reads as *"A declares a proceed
level and honours it in half the cases"*, when the truth is *"A declares a proceed level, honours it in
**every** case, and honours it by hand."*

The defect is the **absence of a link**, not a behavioural mismatch. data→behaviour is complete;
behaviour→data is not (2 blocked fields carry no level); nothing prevents either from drifting.

## 4. Refutation B — "not enforced by the model at all" is false

The single reader is not inert. Tracing it:

`enforcedAt` → `flow/prerequisites.js:11` → `pagePrerequisites`/`sectionPrerequisites` → `flow/gates.js:25,34`
(`prerequisitesMet`) → **three** live consumers:

- `features/hub/controller.js:142` — a failed section gate renders `CANNOT_START_STATUS` ("Cannot start yet",
  `:132-135`) with **no `href`**. The hub row is dead.
- `flow/run.js:14-15` — `flowPageTarget` returns `null` on a failed gate; `nextRunTarget` (`:43-51`) skips it
  and falls through to `hubPath()`.
- `flow/navigation.js:8,14,18,26` — row entry-point resolution.

Delete the Joi block on origin and a blank `countryOfOrigin` still does not let you proceed: every later
`RUN_STEPS` target resolves `null`, you land back on the hub, and every later row says "Cannot start yet". The
model enforces the proceed semantic as **derived downstream reachability, with zero authored prerequisite
edges** — which is precisely what `enforcedAt` was built for.

What the model does not do is generate the **same-page save-block**, and that is **by explicit design**, not
oversight — `docs/flow-and-gates.md:35`: *"A step never blocks on its **own** continue obligation, only
strictly-earlier ones — commodities is not gated by its own `commoditySelection`."* C1 reads a deliberate
division of labour (model owns downstream reachability; controller owns the on-page block) as a total absence
of enforcement.

**The genuine weakness, which C1 gestures at but misidentifies:** the gate is *advisory*, not access control.
No Hapi route pre-handler consults `pageGatePasses` — the consumers are hub rendering, run sequencing,
navigation and `analysis/simulate.js`. (`flow/entry-guard.js` is separate: it bounces only *fresh* journeys to
the import-type filter, and `docs/flow-and-gates.md:107` says direct navigation on a started journey **must**
keep working.) So a locked page still renders and still accepts a POST on deep-link. The invariant holds today
only because the hand-written Joi block on origin makes it impossible to *start* a journey without
`countryOfOrigin`. **The hand-coded block is load-bearing for the model's own gate.** That is the real
coupling defect — and it is a sharper criticism than the one C1 makes.

## 5. Refutation C — "4 sites" is an undercount

A fifth mandate-shaped hand-coded block:
`features/commodities/animal-identification.controller.js:481-486` —

```js
const anyData = [...forms.values()].some((form) => form.holdsData)
if (addIndex !== null && !anyData && forms.has(addIndex)) {
  … errors[fieldName(first.id, addIndex)] = 'Enter at least one identifier for this animal'
}
```

This hand-rolls the `requiredOneOf` group check (`ANIMAL_IDENTIFIER_GROUP`) at point of entry — **duplicating
in a controller the logic the engine already owns at `complete.js:15-21`.** Note this one enforces a
*submit*-level key, so it is a second, distinct flavour of the same disease: not just "the proceed level isn't
wired to its blocks", but "the completion level *is* centralised and a controller re-implements it anyway for
immediate feedback". Mandate-adjacent siblings: `missingAddressErrors` (`:458`), the cardinality-cap block
(`:466-476`), and the count-drop rule (`features/commodities/consignment-details.controller.js:161-175`).

So: **≥5 mandate-blocking sites**, plus 3 cardinality/composite blocks the model cannot express at all.

## 6. Refutation D — `importType`'s empty mandate is a documented ruling, NOT drift

C1 offers *"`importType` hard-blocks while its obligation carries no mandate key at all"* as evidence of
incoherence. Literally true (`features/import-type-filter/obligations.js:1` is `{ id: 'importType' }` vs
`controller.js:26` `requiredOneOf('importType', …)`) — but it is a **reasoned, recorded decision**.
`spec/journey-spec.json:1948`:

> "Mandate reconciled to {} at inc-060 (D10, closing the inc-002 debt): **ENFORCED BY ENTRY ROUTING, not by
> the obligation model** … A model mandate would be a lie in real mode: importType is a service-routing answer
> Mapper A never persists, so it cannot survive a round-trip."

Corroborated at `docs/flow-and-gates.md:107`. `importType` is service-routing data, not notification data; a
model mandate on it would be unsatisfiable after a real-mode round-trip. Citing it as a mandate-model defect
credits a doc-vs-code mismatch that isn't there — and it is the *strongest-sounding* line in C1.

**This also overturns the prior pass's §3**, which read `spec/conflicts.json:216` (*"importType joins the
continue level as the service entry filter"*) as evidence that *"drift has already happened, on the data
side… Spec says continue; code says nothing."* That gets the direction backwards: `conflicts.json:216` is the
**earlier** c-023/c-029 ruling; `journey-spec.json:1948` (inc-060, D10) **supersedes** it. The code follows
the later ruling. The residue is a **stale line in `conflicts.json`** — a spec-internal inconsistency worth
one line of cleanup, not a model defect.

## 7. Doc-vs-code — the claim understates this one

`docs/validation.md:71-78` verbatim: *"`requiredText` and `requiredOneOf` are the save-blocking primitives.
**Exactly one field uses one**: `countryOfOrigin` … A user can walk the whole journey saving blanks, apart from
the country of origin."* Against source:

1. Three controllers call `requiredOneOf` — `origin/controller.js:28`, `import-type-filter/controller.js:26`,
   `declaration/controller.js:17`.
2. Plus the hand-rolled block at `search.controller.js:122-128`.
3. Plus the hand-rolled group block at `animal-identification.controller.js:481-486` (§5).
4. **`requiredText` has ZERO carriers anywhere in `features/`** (grep: no matches) — the doc names a
   save-blocking primitive that nothing uses.

So the doc is wrong in **four** ways, not three, and its closing sentence ("walk the whole journey saving
blanks apart from country of origin") is flatly untrue. This part of C1 stands and should be carried forward
as a standalone finding.

## 8. Not-built vs cannot-be-built (method step 3)

Checked. Nothing in §§3-6 is structural. `enforcedAt` is an open key on a plain object; giving a third
obligation the key costs one line and the gate machinery picks it up for free. The genuinely structural piece
is narrower: **A's proceed level cannot generate its own error message**, because an obligation carries no
type, no copy and no validator by axiom (`docs/obligation-model.md:34-42`) — so there is nothing for a derived
validator to test against. That is structural-*given-the-axiom*, and it is exactly the gap B's `domain/` layer
+ `isSufficientForProceed` (`contract.js:266-283`) fills.

But **"A's proceed level isn't wired to its blocks" is not built, not impossible** — and the fix is the ~30-LOC
boot assertion already identified as option (b) in `L2-mandate-model.md:81`, not a rewrite.

---

## Strongest true version

A's proceed mandate **is** model-enforced, but in one direction only: derived downstream reachability
(`enforcedAt` → `prerequisites.js:11` → `gates.js` → hub "Cannot start yet" + run-step skipping), with zero
authored edges. What the model does not generate is the **same-page save-block** the mandate implies — that is
hand-written at ≥5 controller sites across three mechanisms (Joi `requiredOneOf` ×3, hand-rolled `if` ×2), and
is tied to the declaration by **nothing but discipline: no boot assertion, no test**. Today the correspondence
is perfect (both declared carriers are blocked, so the overlap is 2/2, not 1). Nothing keeps it that way: add
a third `enforcedAt: 'continue'` obligation and the model will dutifully gate every later page on it while its
own page saves blank — the user lands on a hub where everything reads "Cannot start yet" and **no error
anywhere explains why**. Worse, the dependency runs the wrong way: the hand-written Joi block on origin is what
makes the model's own gate safe, because the gate is advisory (no route pre-handler) rather than an access
control.

That is a real point in B's favour — B derives the block from the declaration because it has a value domain to
ask "is this blank?" — but it is a **synchronisation-guarantee** gap, not the "declared but unenforced" gap C1
alleges.
