# Prototype backlog

Ideas and patterns we want to add to the prototype journeys. Throwaway,
non-functional — same rules as the rest of [`prototypes/`](./README.md).

## To add

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
