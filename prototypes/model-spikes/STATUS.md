# Model-spikes build status

Build order is **sequential**: each option must meet the full acceptance bar in
[`README.md`](./README.md) — model authored as data, runtime adapter, validation
adapter, the variant wired, `dump.js`, unit tests, the Playwright demo
suite green against the variant, and self-scoring notes — before the next one
starts.

- [x] Option A — declarative config + selectors (`spike-a`)
- [x] Option B — statechart / FSM (`spike-b`)
- [x] Option C — requirement-graph rules engine (`spike-c`)
- [x] Option D — schema-first (JSON Schema) (`spike-d`)

## How the variant maps to the existing demo journey

Each spike registers one variant under `/prototype/spike-<slug>/...`, named to
mirror the hand-written journey so the existing Playwright demo suite can be
pointed at it by swapping a base path (`SPIKE_BASE`):

| Shape descriptor              | Variant sub-path               | Mirrors                                  |
| ----------------------------- | ------------------------------ | ---------------------------------------- |
| `{ kind: 'grouped', groups }` | `/task-list-with-linear-tasks` | `prototypes/task-list-with-linear-tasks` |

## Verifying one option

```bash
# headless "surface without UI" proof — JSON for the journey shape
node prototypes/model-spikes/spike-<slug>/dump.js <fixture>

# unit tests (runtime + validation), behaviour in/out, no server
npm test

# the demo suite, pointed at this spike's variant
SPIKE_BASE=/spike-<slug> npm run test:prototype
```

The default `npm run test:prototype` (no `SPIKE_BASE`) keeps exercising the
original hand-written journeys, so both must stay green.
