# Live-animals prototype — cleanup backlog

Each item is addressed by an orchestrated subagent/workflow; the parent
(orchestrator) verifies independently (unit + browser + E2E) and commits per
item (green, unpushed) unless told otherwise. Refactors stay behaviour
byte-identical.

## Wave 1 — DONE (2026-07-08)

- [x] **1. Hub status tags** — green Completed tag, no wrapping, govuk toolbox
      only (`e00c85a`, `418b532`)
- [x] **2.** (folded into 1)
- [x] **3. Roll-up vs gate adversarial review** — reviewed, no harmful
      duplication
- [x] **4. Extract reference-data constants into `services/`** (`4a7c12e`)
- [x] **5. Strip comments + car-insurance references** (`6e54adb`)

---

## Wave 2 — real-integration + review + skill (2026-07-09)

Captured from Sam. `origin/main` was merged into the branch first, which grew
the real frontend integration surface (countries + ports-of-entry clients;
committed `mock-*.json` canned data for commodities/species/transporters + all
address parties; a `__mocks__` pattern). Artifacts under
`workareas/journey-builder/EUDPA-249/cleanup-v2/`.

**Design calls (Sam, locked):**

- Run-mode: single global `LIVE_ANIMALS_MODE=stub|real` — `real` uses live
  backends where they exist, improved canned data elsewhere.
- Persistence: **design spike only** for now (no code).
- New skill: **one lean `prototype-element` skill**, 4 TDD modes, citing
  `docs/add-a-*.md`.

### 6. Service reality audit — wave-0 (running)

Per prototype service, classify: `LIVE_INTEGRATION` / `REAL_FRONTEND_HARDCODED`
/ `NONE`, with the real source and how to capture canned data. Gates items 7-9.
Workflow: audit fan-out + completeness critic + synth.

### 7. Capture canned responses

For the services with a real implementation, capture a canned response — live
GETs against the running stack (countries, ports-of-entry) and vendor the real
FE `mock-*.json` where it already exists. Depends on 6 + stack. Orchestration:
canary (countries) then fan out.

### 8. Replace prototype stubs with canned data

Swap each `services/<name>/stub.js` for the captured canned data. Behaviour must
stay green. Depends on 7. Serial, one service at a time (same files).

### 9. Run-mode (stub to real integration)

Single global `LIVE_ANIMALS_MODE`; implement the real clients that exist
(countries reference-data, ports-of-entry), fall back to canned data elsewhere.
Depends on 8. Canary (countries) then fan out.

### 10. Persistence design spike — wave-0 (running)

Design doc: SESSION to Redis, RECORDS to backend `/notifications` (Mongo),
reconcile the `/applications`-vs-`/notifications` shape, feasibility + staged
build plan. Design only — no code this wave. Workflow: study (proto + real) then
adversarial designs then synth.

### 11. Test-gap implement

Implement the missing/weak tests found by the wave-0 test-gap review, following
best practice: test behaviour via input/output, mock at the network boundary, no
coverage-padding. The item-7 canned data doubles as `__mocks__` fixtures.
Depends on 5-identify + 8. Per-file fan-out apply, parent re-verifies.

### 12. Principles conformance — wave-0 (running)

Has the prototype stuck to the principles stated in `docs/`? Review then
remediate surviving violations. Workflow: extract principle checklist then
per-area adversarial audit then critic then synth; then a fixer per violation.

### 13. New skill: `prototype-element` (TDD)

One lean skill, modes add-collection | add-page | add-field | add-service, each
a TDD persona citing `docs/add-a-*.md`. Design running (wave-0); build after Sam
reviews the design. skill-creator scaffold then per-mode reference personas.

---

**Parallelisation:** wave 0 (items 6, 10, 12 + the identify half of 11 + the
design half of 13) runs read-only in parallel. Wave 1 splits into
non-conflicting lanes: services lane 7 to 8 to 9 (serial, same files);
persistence lane 10 (design only, disjoint); skill lane 13 (`.claude/skills/`,
disjoint); test-gap apply 11 (per-file, after 8).
