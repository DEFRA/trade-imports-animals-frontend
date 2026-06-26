# Interaction design — journey-model TODO

Items to explore from the **"Notes from chat with interaction design"** canvas
(`Notes from chat with interaction design.canvas`, repo root), triaged for
EUDPA-249. Each note was reviewed one by one; the ones below are the agreed
threads to pursue. Skipped notes are listed at the end for the record.

## To explore

- [ ] **Contextual back link.** "Back/Navigate button" needs to distinguish
      back-in-journey vs back-to-hub vs back-to-Check-Your-Answers — the model
      should drive which "back" a page returns to, based on how the user arrived.

- [ ] **Convergent obligation (one field, many paths).** "More than one page /
      question can lead to the same end field." Decide: one obligation with two
      implementations, or a logical OR over obligations? Spike the diamond case —
      two mutually exclusive arms (e.g. registered-keeper fork) that re-merge onto a
      single shared question; test `next` convergence, `prev` arm-resolution, and
      branch shut-off/clear.

- [ ] **Conditional data after a rule change.** What happens to already-captured
      answers when the config/rules themselves change? Likely constrained by the
      "delete conditional data" steer — needs a versioning/migration story.

- [ ] **Multiple journeys / journey-to-journey navigation.** One journey may
      navigate into another (e.g. adding multiple drivers on car insurance). Spike
      journey composition / linking.

- [ ] **Optional-but-in-scope questions.** A field can be part of the journey
      yet never required — e.g. "bring your own label / reference number". Model
      in-scope-optional distinctly from required and not-applicable.

- [ ] **Page navigates to the next task.** A task-list where some pages continue
      straight into the next task rather than returning to the hub. Model this as a
      navigation outcome.

- [ ] **State-driven navigation.** Navigation can be determined by the state of
      the journey. Harden next/prev computed from journey state (core to the FSM and
      rules-engine spikes).

- [ ] **Configuration affects obligations.** Versioning, feature flags, A/B
      testing, statute change — config can change which obligations apply. Relates
      to "conditional data after a rule change".

- [ ] **Save by copy, by reference, or both.** e.g. an address — is captured data
      stored by value (copied) or by reference to a shared source? Spike the
      trade-offs.

## Confirm test coverage (believed working — needs explicit regression test)

- [ ] **Field-level persistence on a page.** Believed working; confirm a
      regression e2e test covers it: fill 2 of 3 fields, Save and Continue, go back
      to the task list, return to the page, and confirm the 2 fields are still
      populated.

- [ ] **Partial page completion.** Believed covered (a page can be saved
      incomplete even when a field is required for the overall outcome); make sure
      it is explicitly covered by a regression e2e test.

## Skipped (not pursuing now)

- Minimal journey is selecting a "type" (e.g. animals, or plants).
- Multiple pages in a task / sub-tasks within tasks.
- Delete conditional data on change of determining condition — already proven by
  the `applyAnswer` cascade-clear.
- "Current design is linear followed by task list" — observation; already the
  target shape.
- JavaScript in the browser?
- Some questions mandatory at point of display — covered by the new
  `mandatory-fields` work.
- What determines linear vs task list?
