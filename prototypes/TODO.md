# Prototype backlog

Ideas and patterns we want to add to the prototype journeys. Throwaway,
non-functional — same rules as the rest of [`prototypes/`](./README.md).

## To add

### Make `npm run prototype` pick up prototype changes immediately

`npm run prototype` (→ `dev` → nodemon) only watches `./src` — see
`nodemon.json`. Edits under `prototypes/` (controllers, `sections.js`,
`.njk` templates) don't restart the server or reload, so you have to restart
by hand to see a change. Add `./prototypes` to the nodemon `watch` list (and
make sure `.njk` is in `ext`) so prototype changes are picked up live.

This needs doing **first**: the Playwright demo suite below re-runs the
journeys after every iteration, and without live reload the tests will hit
stale pages and struggle.

### Playwright demo suite — a sweep across every journey, one video each

A sweep across all the journeys: a Playwright test suite whose purpose is to
**demo** the prototype journeys, not just assert on them. Each variant
journey (`linear`, `task-list`, `task-list-with-linear-tasks`) gets its own
test that walks the whole journey end to end — start to confirmation,
exercising the loops, the per-option subtasks and every input type along the
way.

Record **video** for each test so that after every iteration of the
prototype there is a fresh video of each journey to play back as a demo.
Configure Playwright `video: 'on'` (retain every run, not just failures) and
surface the per-journey videos in the report.
