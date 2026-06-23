# Prototype backlog

Ideas and patterns we want to add to the prototype journeys. Throwaway,
non-functional — same rules as the rest of [`prototypes/`](./README.md).

## To add

### Looping / "add another" with a conditional sub-loop

Let the user add several of a thing, one at a time, then return to a list to
add more or carry on. Build this on the **claim details** that already exist
in the shared journey (`shared/sections.js` → `claim-details`), which today
captures a single claim. Turn it into the loop:

- Driving history already asks "Have you had any claims?" (yes/no) — this is
  the **conditional** that opens the sub-loop.
- If **yes**, drop into an **add-another-claim loop**: capture each claim
  (claim type, claim amount) one at a time, **0 to N** times.
- After each claim, show an "add another claim?" list page (add more, or
  continue) before rejoining the main flow.
- Check-your-answers should then list every claim, not just one.

The valuable pattern here is the **conditional question that opens a
sub-loop** — a yes/no answer that either skips the collection entirely or
drops into its own "add another", 0-to-N times, before rejoining the main
flow.

### Select 1-to-N options, each opening its own independent subtasks

Let the user pick **one or more** options from a list (checkboxes), where each
chosen option then has **its own set of subtasks** to complete, independent of
the others. Picking an option adds it to a task list / hub; each one can be
worked, part-finished and returned to on its own, in any order, and its
completion status is tracked separately.

Distinct from the claim loop above: that adds many of the **same** thing one
after another; this fans out into **different** branches of questions, one per
selected option, each its own mini-journey.

### A journey covering every input type

A journey (or section) whose questions deliberately exercise as many GDS
input components as sensibly possible — a reference of how each looks and
behaves. Take the [GOV.UK Design System](https://design-system.service.gov.uk/components/)
as inspiration. Cover at least:

- **Free-form text** — single-line text input (e.g. full name).
- **Multi-line text** — textarea, ideally with character count (e.g. "describe
  the goods").
- **Date** — the 3-field day/month/year date input (e.g. date of birth).
- **Radios (single select)** — pick exactly one (e.g. cover type).
- **Boolean** — yes/no, as two radios (e.g. "Have you had any claims?").
- **Checkboxes (multi select)** — pick zero-to-many (e.g. optional extras).
- **Select / dropdown** — long single-choice list (e.g. country).
- **Number** — numeric input with `inputmode` (e.g. vehicle year, no. of
  passengers).
- **Currency / money** — £-prefixed amount (e.g. estimated value).
- **Formatted / patterned strings** — inputs with a known shape and hint:
  - National Insurance number (`QQ 12 34 56 C`)
  - UK postcode
  - Phone number (`tel` input)
  - Email address (`email` input)
  - Reference number / vehicle registration
- **Conditional reveal** — a radio/checkbox that reveals a follow-up input
  when chosen (e.g. "Other — please specify").
- **Autocomplete** — accessible autocomplete over a long list (e.g. make of
  vehicle).
- **File upload** — single file (e.g. supporting document).

Show realistic validation hints and error messages for each so the prototype
doubles as a "how each input type should be labelled, hinted and validated"
worked example.

### Breadcrumbs on every page

Show a breadcrumb trail on every page so the user can jump back out to other
sub-tasks or task pages without walking back through the journey. Lets them
navigate sideways across the task list / sub-tasks rather than only
back-and-forward through a linear run.
