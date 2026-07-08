# Live-animals prototype — cleanup backlog

Captured 2026-07-08 from Sam. Follows the two-bug fix (commit e00c85a, not
pushed). Each item is addressed by an orchestrated subagent/workflow; the
parent (orchestrator) verifies independently and commits per item (green,
unpushed) unless told otherwise.

Proposed order (dependencies drive it): **1 → 3 → 4 → 5**. Item 1 is quick and
independent (Sam: "firstly"). Item 3 may refactor roll-up code, so it runs
before the big refactors. Item 4 restructures many files. Item 5 (comments +
best-practice sweep) runs LAST so it covers the new `services/` code and the
item-3 refactor too.

---

## 1. Fix status-tag wrapping + green "Completed" tag ▸ FIRST

**What:** On the hub task list the status tags wrap mid-phrase ("Not / yet /
started", "Cannot start / yet"). Fix the wrapping using **govuk-frontend
toolkit options only — no custom CSS** (grid width, tag usage, or shorter
idiomatic text; the grey "Cannot start yet" is plain text and may wrap
acceptably, but the tags should not look broken). Also: **"Completed" should be
a green tag** (`govuk-tag--green`), not plain text.
**Acceptance:** hub tags render on one line at desktop with no custom CSS;
Completed shows as a green tag; unit + E2E updated; browser-verified.
**Orchestration:** one implementer subagent + parent browser verification.

## 2. (folded into 1) Green Completed tag

Merged into item 1.

## 3. Adversarially review the task-list roll-up vs gate logic

**What:** The roll-up (`engine/status.js`, `flow/section-status.js`) and the
derived gates (`flow/gates.js`, `flow/prerequisites.js`) feel like they
duplicate logic (both reason about obligations in/out of scope + answered-ness
across sections). Adversarially review for real duplication / a single source
of truth; consolidate if the duplication is genuine, leave it if the two
concerns are legitimately distinct. Do NOT weaken behaviour — the gating +
roll-up are verified correct (1894 unit, 18 E2E).
**Acceptance:** a written finding (duplication real or not, with evidence); if
real, a refactor that removes it with all tests still green.
**Orchestration:** adversarial-review workflow (find → verify → recommend),
then an implementer if a refactor is warranted.

## 4. Abstract hardcoded constants into `services/`

**What:** Extract the hardcoded reference-data constants (country list;
commodity list; species; `COMMODITY_OPTIONS`; `PACKAGE_COUNT_COMMODITIES`; the
per-identifier-type commodity lists; and any other external-dependency data)
into a `services/` folder — **one service per thing MDM (or another external
system) will eventually provide**. Controllers/obligations consume the service
interface; the constants become the service's stub implementation. Outcome:
controllers are "done"; the only deferred work is implementing each service for
real against MDM/etc.
**Acceptance:** a `services/` folder with a clear interface per external
dependency; no reference-data constant left inline in a controller/obligation;
each service documents (in docs/, not inline) what real system backs it;
all tests green.
**Orchestration:** discover-all-constants + design service boundaries
(checkpoint the boundary design with Sam) → implement per service.

## 5. JS best-practice + comments sweep

**What:** Comments are littered everywhere against best practice, many stale,
many referencing the irrelevant/confusing car-insurance example. Sweep the
prototype for JS best practice and comments: **remove comments that don't
justify their existence** (a comment must explain non-obvious _why_, not restate
the code or narrate history — git is the history); **remove all car-insurance
references**; move any genuine documentation into `docs/`. Apply the workspace
JS best-practice + doc-comment guides.
**Acceptance:** no car-insurance references remain; comment density down to
justified _why_-comments; documentation lives in docs/; behaviour unchanged;
all tests green.
**Orchestration:** per-file fan-out (code-style-style sweep) → apply →
parent verify. Runs LAST.

---

### Cosmetic (separate, not in the 5): leftover "Car insurance — obligations

v2" header/title copy in the layout — folds naturally into item 5's
car-insurance-reference removal.
