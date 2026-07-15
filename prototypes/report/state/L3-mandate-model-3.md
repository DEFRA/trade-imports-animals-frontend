# L3 — Adversarial verification — mandate-model — C3

**Claim under test:** "Each side enforces exactly one of the two mandate levels. A's submit gate is real and server-side but its proceed level is not model-derived. B's proceed gate is real (one enforcement point) but SUBMIT DOES NOT EXIST — there is no POST on /check-your-answers, `journeyState(..., submitted)` is never called with `true`, and B's own doc claims submission is blocked when it is not."

**Verdict: AMENDED.**

The B half is rock solid — I attacked it hard and could not break it. The A half is directionally right but the *headline sentence is false as written*, and **two of the three offered evidence lines are factually incorrect** (they happen to have the right conclusion, but a reader checking them will find they do not say what the claim says they say). Corrections in §4.

Verified independently at source; I did not inherit the prior pass.

---

## 1. A — submit gate is real and server-side. CONFIRMED.

- `flow/section-status.js:11-15` — quote is real: `readyForCheckYourAnswers` = `taskRows.every(row => status === FULFILLED || NA || OPTIONAL)`. It *is* model-derived — row statuses roll up from `statusOf` over the obligations' `required` / `requiredAtLeastOne` / `requiredOneOf` keys.
- `flow/flow.js:72` — verified verbatim: `gate: (scope) => scope.readyForCheckYourAnswers` on the `review` section. This is the only authored gate in the flow.
- `engine/write.js:89-95` — verified verbatim. `submitJourney` re-derives scope **server-side** from stored answers and returns `{ ok: false }` unless `scope.readyForCheckYourAnswers`, **before** `records.finalise`.

**Counter-example hunt (bypass to finalise):** grepped `submitJourney|finalise` across the whole prototype. `records.finalise` is reached from exactly two non-test places: `engine/write.js:93` (inside the gate) and `engine/store.js:10` (`submit: records.finalise`, a port alias). There is no route that reaches `finalise` without passing the gate. POSTing the declaration directly cannot submit an incomplete journey. **No bypass found.**

## 2. A — "its proceed level is not model-derived". OVERSTATED — this is the amendment.

**The true part** (verified, and it is the substantive point):

- A's blank-save blocks are hand-authored Joi in controllers. Decisive evidence: **`grep -rn "registry" live-animals/lib` returns NOTHING.** A's entire validator library has no access to the obligation model. The block that stops you saving the origin page blank cannot be derived from the mandate keys because the code doing the blocking cannot see them.
- `importType` hard-blocks at its controller while its obligation carries **no mandate key at all** — proof that the block and the model are independent surfaces.

**The false part** (why the claim is overstated): **`enforcedAt` IS model data and IS read, and it DOES derive a real proceed-level gate.**

- `flow/prerequisites.js:8-26` — `continueObligationOwners()` filters `obligation.enforcedAt !== 'continue'` (line 11) and computes, from flow order + the dispatch index, the continue-level obligations owned by a **strictly-earlier** step.
- `flow/gates.js:21-37` — `pageGatePasses` / `sectionGatePasses` = `prerequisitesMet(pagePrerequisites(page.id), scope)`. Consumed by `features/hub/controller.js` ("Cannot start yet" rows), `flow/navigation.js`, `flow/run.js`, `analysis/simulate.js`.

So A **does** derive proceed-level enforcement from the model. It just enforces it in a **different shape**: `enforcedAt: 'continue'` blocks *entry to later steps* until answered, rather than blocking *the save on the owning page*. Two carriers (`features/origin/obligations.js:4`, `features/commodities/obligations.js:6`).

**But — a new finding that cuts AGAINST A, harder than the claim does.** A's model-derived proceed gate is **not a route guard**. The prototype registers exactly one `server.ext('onPreHandler')` (`routes.js:26`), and it calls `entryGuardTarget`, which (`flow/entry-guard.js:44-50`) checks only *"has this journey started / come through the filter"* — it never consults `pagePrerequisites` or `pageGatePasses`. So a hand-typed URL to a later page **is not blocked by prerequisites**. A's model-derived proceed enforcement is **advisory/navigational**; its only *hard* proceed enforcement is the hand-coded Joi. That is a sharper indictment than "not model-derived", and it is the version that should go in the report.

## 3. B — proceed gate real, one enforcement point; submit does not exist. CONFIRMED.

- `contract.js:266-283` — verified verbatim: `descriptor.mandatoryToProceed && !isSufficientForProceed(...)` → push `{ code: 'flow.required', … }` → `continue` (skipping the domain check). `isSufficientForProceed` at `:315-322`, with the optional short-circuit at `:316`.
- **One enforcement point, universally reached:** `mandatoryToProceed` appears in B's runtime code at only `contract.js:267` (the gate), `lib/build-field-descriptors.js:102` and `engine/index.js:254,266` (both pure pass-through). The gate lives in `validatePagePayload`, which is called by **all three** page controllers — `lib/page-controller.js:68`, `lib/line-page-controller.js:103`, `lib/unit-page-controller.js:135`. Every flow-generated POST goes through it. The gate is real and total.
- **Submit does not exist — hunted hard, found nothing:**
  - `routes.js:73-79` — `GET ${BASE}/check-your-answers` only. I read the **entire** route table (`routes.js:52-207`): POSTs exist for `/reset`, `/lines/add`, `/lines/{id}/delete`, `/lines/{lineId}/units/add`, `/lines/{lineId}/units/{unitId}/delete`, and the flow-generated page POSTs. **No POST on CYA. No submit route anywhere.**
  - `features/check-your-answers/template.njk:33-35` — there is **no `<form>` and no submit button**. When `journeyState == 'fulfilled'` it renders a bare `<p>`.
  - The copy in that `<p>` is the confession: `locales/en.json:489` — *"All required obligations are fulfilled. **In a real service, this is where the user would submit.**"* The spike says so itself.
  - `lib/state.js` — no `submitted` flag exists (grep for `submit` across `lib/` returns only `submittedValues`, i.e. POST form values on the error re-render — unrelated).
  - Sibling spike `prototypes/model-spikes/obligations-v4-model/` — grep for `submit|route` matches **only two markdown files**. No code, no routes. Not a hiding place.
  - Dead ends confirming the gap: `STATUSES.SUBMITTED` has a hub tag class (`features/hub/controller.js:31`) and an i18n key (`:40`) that **can never fire**, because `journeyState` never returns SUBMITTED in production.
- `obligations.md:1801-1812` — verified verbatim. It lists **three** "Enforcement points", the third being *"**On CYA Submit** — journey status must be Fulfilled or Optional …; submission is blocked otherwise."* **There is no CYA Submit.** Doc-credits-what-code-does-not-honour: **CONFIRMED**, and it is the cleanest example of that failure mode in either tree.

## 4. Errors in the evidence as offered (the claim is right for partly wrong reasons)

1. **"`journeyState(..., submitted)` is never called with `true`" — FALSE as stated.** `engine/index.test.js:578` calls `journeyState(readyFlow, readyState, true)` and asserts it returns `STATUSES.SUBMITTED`. The defensible statement is: *never passed `true` on any **production** path.* The engine's submit branch is tested; it is simply unreachable from the app.
2. **"only caller `contract.js:91-93`, whose only caller is `features/check-your-answers/controller.js:342` with one argument" — FALSE.** `statusOfJourney` has **three** production callers: `features/check-your-answers/controller.js:342`, `features/hub/controller.js:121`, and `dump.js:94`. All three pass one argument, so the *conclusion* survives — but the cited fact does not, and anyone spot-checking it will find the claim careless.
3. **"Each side enforces exactly one of the two mandate levels" — FALSE as written.** In the running app A enforces **both**: you genuinely cannot save the origin page blank (hand-coded), and you genuinely cannot submit an incomplete journey (model-derived). The real asymmetry is about **derivation**, not enforcement. B is the only side that truly enforces one level.

## 5. Not-built vs cannot-be-built

The claim does not allege that B's missing submit is *structural*, and it must not be read that way. **B's submit gap is pure wiring, and it is small.** B already has: readiness computation (`classifyEntries` → `journeyState`), the `submitted` parameter on `journeyState`, the `SUBMITTED` status constant, and a hub tag + i18n key for it. Missing: a POST route, a `submitted` flag in `lib/state.js`, and a persistence story. Nothing in B's model resists a submit gate — B just stopped at the model boundary, which is exactly what a model spike is *for*. Do not score this as a model defect. (The doc overclaim, by contrast, is a real defect — it asserts an enforcement point that does not exist.)

Symmetrically, A's missing model-derived blank-save block is also not structural — but it is *closer* to structural than B's gap, because A has **no value domain** (`docs/obligation-model.md` axiom: an obligation carries no type and no validation), so a `mandatoryToProceed` flag in A would have nothing to ask "is this blank?" of. A would need to import B's `domain` layer to derive its proceed block generically. That is the asymmetric finding worth carrying forward.

## 6. Terminology trap for downstream readers

B's own vocabulary is **inverted** relative to this claim. `RECOMMENDATION.md:159` calls `mandatoryToProceed` the "**submit**-mandate" (HTML form submit = Save and continue) and `obligation.status` the "completion-mandate". Anyone quoting B's docs into this comparison will produce a sentence that reads as its own opposite. Pin the vocabulary in the final report.
