# Prompt — design an obligations _v2_ prototype (per-page control, lighter obligation model)

> Hand this whole file to a **fresh agent**. It is self-contained: the agent will not have
> seen the conversation that produced it. The task is to **investigate**, then **design AND
> build** a v2 prototype — orchestrated as a **multi-phase workflow** (e.g. investigate →
> design → implement → verify, or whatever phases you judge right). The end goal is a working
> v2 spike, not just a design document. Scope the phases yourself; the design phase feeds the
> implement phase.

---

## Background — what exists today

There is an existing throwaway prototype, the **obligations-standalone-spike**, at:

```
prototypes/standalone/obligations-standalone-spike/
```

Start by reading its `START_HERE.md`, then `README.md`, `DESIGN-DECISION.md`, `EXTENDING.md`,
and the source paradigm spec at `prototypes/model-spikes/obligations.md`. **Treat the spike as
READ-ONLY reference** — do not edit it.

In one paragraph, what it is: a car-insurance task-list journey built on the _obligations
paradigm_. The whole journey is committed **declarative data** — an obligations catalogue keyed
on immutable UUIDs (`model/obligations.json`) plus a Container-tree **Flow** (`model/flow.json`)
that owns **all page copy**. Two pure evaluators read that data (the ObligationEvaluator decides
what is owed and whether it is satisfied; the JourneyEvaluator decides where it shows in the page
tree and where to go next), and one side-effecting orchestrator writes answers and re-evaluates
to a fixed point. Critically, **there are no per-page templates or per-page controllers**: all
twelve question pages render through **one generic `templates/page.njk`**, and `routes/page.js`
derives its GET/POST routes from the Flow. Presentation is _projected from the model_.

## Why we are changing it — the design verdict driving this task

We have decided the fully config-driven approach is the **wrong trade for our reality**:

1. **We have a design team who will legitimately want per-page variation and bespoke layouts.**
   A journey driven entirely from JSON/config cannot give us the flexibility to build custom
   things page-by-page as design requires.
2. The spike's own evidence backs this up: even it could not stay fully generic — the **claims
   pages are hand-authored bespoke templates** ("bespoke bypasses" in its design doc). The moment
   a page needs something custom, the paradigm drops out of config into a hand-written template.
   If bespoke is the **norm** for us rather than the exception, the generic rendering engine is
   pure overhead we are constantly routing around.
3. Its headline maintainability pitch ("adding a field is just a data edit") only holds while
   every page is a uniform stack of standard GOV.UK widgets. Under real design-led variation that
   pitch evaporates, and you are worse off than plain per-page templates because copy lives in
   JSON, structure lives in a generic template, and a developer must hold both in their head.

**But we still see real value in the obligations + flow _concept_** — modelling _what is owed_,
the _relationships between obligations_, and _what activates what_ — as a clean state layer. We
want to keep that idea, in a **lighter-touch** form, while restoring conventional per-page control.

## The architecture we want you to design (v2)

Design a **different version** of this prototype with the following shape. These are requirements,
not suggestions:

### Restore per-page control

- **Every page has its own `.njk` template file.** No single generic page template driving all
  question pages. Designers can build a bespoke layout per page with full freedom.
- **Every page (probably) has its own controller** — its own server-side handler owning that
  page's GET/POST logic, validation wiring, and view-model assembly. We want explicit,
  greppable, per-page server-side control, not one generic handler.

### Keep a lighter-touch obligation + flow model

- Retain the concept of **obligations** and the **relationships between them** (dependencies,
  activation — e.g. when one obligation becomes active/answered it brings others into scope).
  Keep the "what is owed / is it satisfied / what does answering this activate" pattern as a
  distinct, declarative state layer.
- Prefer **plain JavaScript module definitions** over pure JSON-with-UUIDs. But stay **as close to
  pure declarative data as possible** — the obligation definitions should read like data, _not_
  be overloaded with imperative page logic. The JS is there to make the model ergonomic (real
  references between obligations, no UUID ceremony), not to smuggle behaviour into the model.
- The model **should NOT own page copy or presentation**. That is the key inversion from v1:
  copy, layout and widgets live in the per-page templates/controllers, **not** in the flow.
- **Dispatch, don't render.** When an obligation becomes activated, the model **indexes off to the
  relevant page**, and **that page owns its own logic** for how it collects/presents/validates the
  obligation. The obligation layer answers "what is owed and what page handles it"; the page
  answers "how". Design the seam between the two crisply.

### Keep what genuinely earned its place (evaluate, don't cargo-cult)

Review the v1 spike and decide, with reasons, which of its ideas survive into a lighter model —
e.g. the dual identifier (stable id vs meaningful name), scope-exit data wipe (Yes–No–Yes:
data destroyed not hidden), the pure-evaluator/side-effecting-orchestrator split, reconcile-on-load
pruning, the four-status roll-up. Keep the ones that still pay for themselves once pages are
hand-built; drop the ones that only existed to serve the generic renderer.

## What to produce — a workflow that builds v2

Run this as a **multi-phase workflow** and end with a working v2 spike. Suggested phases (adapt as
you see fit):

**Phase 1 — Investigate.** Read the v1 spike and the source spec end-to-end. Produce a short
findings note: how v1 is structured, which of its ideas earned their place, and specifically where
the fully-generic rendering hurt (the bespoke-bypass pages are the evidence). This grounds the
design.

**Phase 2 — Design.** Produce the v2 design. It must cover at least:

- A one-paragraph statement of the v2 paradigm and how it differs from v1.
- A **module map** and folder tree — where the obligation/flow layer lives, where per-page
  controllers and templates live, and the dispatch seam between them.
- The **obligation-model shape** in JS: show the actual definition style you propose and justify
  how it stays "close to data" without overloading it with page logic.
- A worked illustration of **one page end-to-end** (obligation definition → how it activates →
  which controller/template handles it → how an answer flows back into the model), plus the
  claims-style **indexed/repeating** case, since that is where v1 needed bespoke bypasses.
- An honest **trade-off ledger** vs v1 (mirror the v1 README's honesty), and which v1 ideas you
  keep vs drop, each with a one-line reason.
- Consider generating a few independent v2 architecture proposals from different angles, scoring
  them, and synthesising the winner, if the design space is wide enough to warrant it.

**Phase 3 — Implement.** Build the v2 spike from the chosen design: the per-page templates and
controllers, the lighter obligation/flow layer, the dispatch seam, and the journey wiring.

**Phase 4 — Verify.** The acceptance framing is the same one v1 used: the **three shared Playwright
specs** are the ground-truth journey the v2 spike must satisfy, wired in the same way v1 is. Get
them green, plus whatever unit coverage the design calls for.

## Guardrails

- Do **not** modify the existing `obligations-standalone-spike/` — it is read-only reference.
- Build v2 as a **new sibling** under `prototypes/standalone/` (suggest
  `obligations-v2-spike/`), leaving v1 untouched so the two can be compared.
