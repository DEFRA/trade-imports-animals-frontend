# Divergence register — the M2 gate deliverable

> **ORACLE RETIRED AT inc-023 — final state zero behavioural divergence.** A's
> engine and the A-vs-B oracle (`model/bridge/model-equivalence.test.js`) were
> deleted at inc-023: B is the sole runtime model, so there is no A side left to
> diff. Every divergence below reached its resolved/subsumed state and the
> oracle was green (zero behavioural divergence on inScope, status and wipe)
> when retired. The former oracle assertions were re-expressed as B-only pins
> (`model/bridge/{scope,status,collection-complete}.test.js`); the two flow-level
> reachability checks A's prover carried moved to `analysis/flow-reachability.js`.
> This register is kept as the historical record of the M2→M3 convergence.

**Produced by** `inc-010` (the model-equivalence oracle), 2026-07-17. **For:** Sam, at the M2 gate.
**Oracle:** `model/bridge/model-equivalence.test.js` — runs A's engine and B's (via the bridge) over a broad input space and compares three axes: **inScope**, **status (mandate)**, **wipe (data destruction)**.

**A** = `prototypes/standalone/live-animals`. **B** = the vendored obligation model under `model/` (Paul's blend, retrofitted).

---

> **UPDATE — inc-016a (EUDPA-288): all three divergences RESOLVED.** The three ruled "fix B" edits below were applied to B's evaluator manifest (`model/obligations/obligations.js`) at inc-016a: `regionOfOriginCode`'s no/unset branch is now `{ inScope: false }` (fixes #1 scope + #3 wipe, `c-017`; the misleading V4 retain comment was deleted), and `transitedCountries`' land-transport branch is now `status: 'mandatory'` (fixes #2, `c-038`). The oracle's `KNOWN_SCOPE_BONLY` / `KNOWN_STATUS` / `KNOWN_WIPE_AONLY` sets are now empty and the full sweep asserts **ZERO** behavioural divergence A-vs-B. See `model/DESIGN-DELTA.md §15`.

## Headline: this plan can proceed. Three behavioural divergences, all ruled, all "fix B".

The oracle ran both engines over **39 states** (a 24-state gate grid + happy-path + the submit-ready seed + 13 constructed edge/probe states) across all three axes. It found **exactly three** behavioural divergences. **Every one is already ruled in `spec/conflicts.json`** — none is an open requirements question — and **every one resolves by fixing B** during the M3 cutover. A never over-scopes and B never over-wipes: those directions are clean everywhere.

This is the moment the plan could still be cheaply abandoned. **The evidence says proceed.**

| #   | Obligation           | Axis        | A does                                                        | B does                                                      | Blast radius                                                                       | Ruled by    | Resolution                                                                  |
| --- | -------------------- | ----------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| 1   | `regionOfOriginCode` | **inScope** | out of scope unless `regionOfOriginCodeRequirement === 'yes'` | keeps it in scope on every branch (optional when not 'yes') | **highest** — fires whenever the requirement ≠ 'yes' (answered 'no' OR unanswered) | **`c-017`** | (ii) **fix B** — gate the no/unset branch `inScope: false`. One line.       |
| 2   | `transitedCountries` | **status**  | `mandatory` (`required: true`) once land transport is active  | `optional` in the land-transport branch                     | **medium** — fires whenever means of transport is Railway / Road Vehicle           | **`c-038`** | (ii) **fix B** — set the `whenTrue` branch `status: 'mandatory'`. One line. |
| 3   | `regionOfOriginCode` | **wipe**    | destroys the stored value when it leaves scope (`wipeOnExit`) | retains it (same root as #1 — it never leaves B's scope)    | **highest** — same trigger as #1, on the DATA axis                                 | **`c-017`** | (ii) **fix B** — falls out of the #1 scope fix automatically.               |

**Classification legend:** (i) B is right, fix A's expectation; (ii) A is right, fix B; (iii) real requirement question, needs a ruler.

**All three are class (ii): A is right, fix B.** There are **zero** class-(i) and **zero** class-(iii) divergences. Nothing here needs Sam or the PO to rule — the rulings already exist; the register is a work list, not a decision queue.

Sorted by blast radius: #1 and #3 (region-code, both faces of `c-017`) are the widest — they fire on nearly every realistic session. #2 (transit mandate) fires only under land transport.

---

## 1. `regionOfOriginCode` — inScope · blast radius: highest · **fix B** · ✅ RESOLVED (inc-016a)

**The disagreement.** A gates the region code on `regionOfOriginCodeRequirement === 'yes'` and takes it out of scope (and wipes it — see #3) otherwise. B's `regionCode.applyTo` returns `inScope: true` on **both** branches — `mandatory` when the requirement is 'yes', `optional` otherwise — and a comment cites V4 as the reason the value is retained.

**Pervasive, not a single-state red.** The oracle projects `regionOfOriginCode` into B's scope in **every** state where the requirement is not 'yes': answered 'no' (`regionNotRequired`) OR left unanswered (`regionUnanswered`), and in all 12 grid states with `regionOfOriginCodeRequirement: 'no'`. A does not. This is the guaranteed oracle red the plan predicted (PLAN §2.1 #2), and it fires on the majority of sessions.

**Already ruled — `c-017` strikes B's claim down by name.** `spec/conflicts.json:152` (Sam, spec gate 2026-07-07): _"Wipe on exit everywhere… the v4-model branch's retained `regionCode` are **not requirements**."_ B's comment cites V4 for a claim the ruling explicitly rejects.

**Resolution: (ii) fix B, one line.** Make the no/unset branch `inScope: false` (an `equalsGate(regionCodeRequirement, 'yes', …)`), and delete the misleading V4 comment so it is not cited again. **Do it at M3 cutover.** Not an open question.

---

## 2. `transitedCountries` — status (mandate) · blast radius: medium · **fix B** · ✅ RESOLVED (inc-016a)

**The disagreement.** Both engines agree `transitedCountries` is **in scope** under land transport — this is not a scope divergence. They disagree on **mandate**: A declares `required: true` (mandatory), B stamps `status: 'optional'` in the land-transport (`whenTrue`) branch.

**Where it fires.** The oracle sees it in every state where `meansOfTransport` is Railway / Road Vehicle — the happy-path, `transportLand`, and 12 of the 24 grid states. Elsewhere (`transportPrivate`, air/sea) the obligation is out of scope on both sides and mandate is not compared, so the axis is clean.

**This is the axis inc-009 did not cover** — the scope-only preview could not see it, because it is a mandate difference on an obligation both sides scope identically. It is the first thing the status axis surfaces, exactly as the plan (PLAN §2.1 #3 / D4) predicted.

**Already ruled — `c-038` resolves REQUIRED.** `spec/conflicts.json:347` (2026-07-13): transit-countries mandate _"resolves **REQUIRED** when meansOfTransport is Railway/Road Vehicle."_ B's `optional` is not a disagreement of substance — it is a snapshot of the V4 tension **before** `c-038` settled it. B predates the ruling.

**Resolution: (ii) fix B, one line.** Flip the `whenTrue` branch to `status: 'mandatory'`. **Do it at M3 cutover.** Not an open question.

**Note — mandate is static on both sides.** Neither engine varies mandate per record (inc-003 §6). The oracle therefore compares a single scalar mandate per obligation, not a per-record dimension. `transitedCountries` is the only obligation whose static mandate disagrees.

---

## 3. `regionOfOriginCode` — wipe (data destruction) · blast radius: highest · **fix B** · ✅ RESOLVED (inc-016a)

**The disagreement, on the DATA axis.** Feed a state with a stored `regionOfOriginCode` and the requirement set to 'no' (`regionNotRequired` / `wipe-region`): A's `reconcile` returns it in the `wiped` set — the value is **destroyed**. B never purges it, because (per #1) B never takes it out of scope, so the value **survives**. The oracle confirms A really destroys it (not a no-op) via `wipedByA`.

**Same root as #1, different consequence.** #1 is the scope disagreement; #3 is what that disagreement does to the user's stored data. Fixing #1 (gate the no/unset branch out of scope) makes B's converged purge destroy the orphaned value automatically — **#3 needs no separate change**. It is listed separately because it is a distinct axis and a distinct risk (silent data retention across a gate flip), and because it is the DATA-axis proof that `c-017` bites.

**Control — the wipe axis is not vacuous.** For every **non-region** gated value that flips out of scope (`wipePurpose`: purpose with reason≠internal-market; `wipeTransit`: transit under air transport; `wipeCommercialTransporter`: commercial transporter under a Private declaration) **both engines destroy the value and agree**. So the wipe axis genuinely exercises destruction on both sides — region-code is the sole disagreement, not an artefact of one side never wiping.

**Already ruled — `c-017`** (same as #1). **Resolution: (ii) fix B**, subsumed by the #1 scope fix. **Do it at M3 cutover.**

---

## The five structural deltas the oracle is BLIND to — M2-green ≠ behaviourally complete

**Read this before treating a green oracle as "done".** An oracle compares two engines over the **same** inputs; it cannot report a shape one side is **incapable of representing**. M0 measured five such deltas (PLAN §3 ⚠️; `retrofit/DELTA-REGISTER.md`, `retrofit/SEMANTICS.md`). They are **not** in the register above because the oracle structurally cannot see them — they are tracked by the M0 registers and must be closed **independently** of the oracle's red list.

| #   | Structural delta                                                                                                                                                       | Why the oracle is blind                                                                                                                                                                       | Tracked / ruled                                                                       | Status                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **`documents` topology** — A models accompanying documents as a repeatable collection (cap 10, V4); B models the four fields as notification-level singletons (cap 1). | The oracle only ever compares one-document journeys, where both agree. It cannot manufacture a second document B has no slot for.                                                             | `journey-spec.json:1353`, `c-034`, `c-004` — **A right, V4 permits 10.**              | ✅ **RESOLVED (inc-016b).** B grew a `documents` group (four fields `within` it; per-record `presentPerRecord` scope). Bridge de-special-cased — multi-doc round-trips A→B→A. Oracle exclusions dropped; documents now agrees. `DESIGN-DELTA.md §17`. |
| D2  | **`maxEntriesFrom`** — A caps identifier records at the declared animal count; admission-control, rejects at the cap.                                                  | B has **no numeric decision channel** (scope boolean, status enum) and its group implications ignore `applyTo` records — there is no input that makes B express a cap, so nothing to compare. | `c-031`, `journey-spec.json:1339` (built in A at inc-063) — **A right.**              | Real capability gap. MODEL_EXTENDER + an append-time enforcement seam. Second-largest M1 item after the bridge.                                                                                                                                       |
| —   | **`requiredAtLeastOne`** on `animalIdentifiers` (unit floor).                                                                                                          | B's `requires.minEntries` is generic but not wired onto `unitRecord`; no input surfaces the floor as a divergence.                                                                            | `c-031` — one-line manifest value on B.                                               | Split from D2 (SEMANTICS Q1′). Wire `requires: { minEntries: 1 }`.                                                                                                                                                                                    |
| —   | **`multi` / `transitedCountries` array shape.**                                                                                                                        | No live gate reads an array on either side; the widget→persistence coupling that would differ lives in B's discarded `contract.js`. The oracle sees no behavioural effect.                    | SEMANTICS Q2 — exactly one obligation needs it; **do not port B's wrong 3-name Set.** | Cleanup, not prerequisite. Behind M5's gate; arguably drop.                                                                                                                                                                                           |
| —   | **`pathPrefix` at depth ≥2.**                                                                                                                                          | No gate sits inside a depth-≥2 group today, so no input arms the projection-slice bug. Latent, not live.                                                                                      | SEMANTICS Q3 — proven fix already vendored (`DESIGN-DELTA.md §1`, inc-006).           | Fixed in M1 regardless. Re-check if a per-unit gate is ever added.                                                                                                                                                                                    |

**The framing that matters for the M2 gate:** the oracle is **necessary, not sufficient**. Green means "A and B agree on the deltas the oracle can express (scope, status, wipe over shared inputs)". It does **not** mean the retrofit is behaviourally complete — the five above are real and are tracked by the registers, not by this oracle.

---

## What the M3 cutover (inc-012+) inherits from this register

- **Three "fix B" edits, all one-liners, all ruled — apply them during cutover, not before:**
  1. `regionCode` no/unset branch → `inScope: false` (`c-017`). Fixes divergences #1 and #3 together.
  2. `transitedCountries` `whenTrue` → `status: 'mandatory'` (`c-038`). Fixes #2.
  3. Delete B's misleading "V4 does not purge regionCode" comment so it is never cited again.
- **No "fix A's expectation" work** — A's engine is right on all three; the oracle's A side is the reference. Do not weaken A's assertions to make B pass; fix B.
- **No open rulings block cutover** — nothing here waits on Sam or the PO. (The one outstanding PO item, `commodityType` / `c-037`, is structural — B-only, invisible to the oracle — and is chased separately per `DELTA-REGISTER.md` D6.)
- **The oracle stays green as a cutover regression pin.** Once B is fixed, divergences #1–#3 disappear and the `KNOWN_*` sets in the oracle shrink to empty — update them in lockstep with each B fix so the sweep keeps catching anything new.
- **Do not read M2-green as complete** — carry the five structural deltas into M1/M3 as their own work items (D1 and D2 are MODEL_EXTENDER increments on B).
