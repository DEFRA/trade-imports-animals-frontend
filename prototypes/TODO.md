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

### Breadcrumbs on every page

Show a breadcrumb trail on every page so the user can jump back out to other
sub-tasks or task pages without walking back through the journey. Lets them
navigate sideways across the task list / sub-tasks rather than only
back-and-forward through a linear run.
