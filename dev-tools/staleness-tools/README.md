# Staleness tools

CLI for updating a notification into a stale state.

Intended to facilitate manual testing.

The tool writes direct to Mongo. It does not go through the frontend's
write path.

## Prerequisites

- Workspace compose stack running locally (`tim docker dev` or
  `scripts/stack/run-stack.sh`). MongoDB, backend, and frontend up.
- A notification you can identify by reference number. The tool does not
  require the notification to be submitted.
- - `MONGODB_URI` reachable at `mongodb://localhost:27017` (the compose
    stack default). Override with the env var if your Mongo is
    somewhere else.

## Usage

### One-liner — seed a fresh notification, mutate it, print the URL to open

```sh
npm run seed:demo -- --scenario country-stale
# Seeded draft notification: GBN-AG-26-ABCDEF
# Applied country-stale to GBN-AG-26-ABCDEF.
# Open: http://localhost:3000/notifications/GBN-AG-26-ABCDEF/notification-view
```

Optional `--state draft|submitted|amend` (default `draft`).

Requires the `trade-imports-animals-tests` clone to be a sibling of this
repo (the workspace layout); set `TRADE_IMPORTS_ANIMALS_TESTS_PATH` for
anything else, and `TRADE_IMPORTS_ANIMALS_FRONTEND_BASE_URL` if the
frontend isn't at `http://localhost:3000`.

### Mutate an existing notification

```sh
# List every scenario the tool knows
npm run seed:stale -- --list

# Apply a scenario to a notification you already have a ref for
npm run seed:stale -- --scenario country-stale --ref GBN-AG-26-ABCDEF
```

Each scenario is idempotent — running it twice leaves the notification in
the same terminal state. Applying two scenarios to the same notification is
supported but the effects overlap; one scenario per notification gives the
cleanest walk-through.

Refresh the frontend after seeding — the frontend re-reads the notification
on every request, so no restart is needed.

### Just seed a notification (no mutation)

```sh
npm --prefix ../trade-imports-animals-tests \
  run --silent seed:notification -- --state draft
# prints GBN-AG-26-ABCDEF
```

Or create one manually via the UI and read the ref off the dashboard card.

## Scenarios

| Scenario id          | Simulates                                                                                         | What to look for                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `country-stale`      | Reference-data re-release dropped the ISO code the trader submitted for the country of origin.    | Origin page renders unselected with no explanation. CYA card shows the raw ISO code. Review-page Continue and declaration submit refuse until the trader re-picks.     |
| `party-deleted`      | An address-book party (any of the six party roles) has been deleted since the trader picked it.   | CYA card shows "Not provided" plus an outstanding-party error against the affected role. Task list demotes the row to "To do". Declaration submit refuses.             |
| `unknown-obligation` | An obligation has been removed from the manifest since submit — a fulfilment keyed on it lingers. | Engine's `dropUnrecognisedFulfilments` sweeps the entry out silently on read. Dashboard is unaffected. Amend journey has lost the answer with no user warning surface. |

## Design

Each scenario is a tiny module in `scenarios/`. Two shapes are used, one
per scenario kind:

- **Answers-space + `assembleFulfilments`** (`country-stale`). The
  scenario says "I want the stored answer to be `{countryOfOrigin: 'ZZ'}`"
  and the frontend's own `assembleFulfilments` produces the fulfilment
  payload the scenario then `$set`s. A future change to how the answer
  is serialised (bare string → object with region metadata, say) flows
  through the assembler without the scenario knowing.
- **Raw fulfilment** (`party-deleted`, `unknown-obligation`). The
  scenarios that operate on the fulfilment shape directly —
  `party-deleted` walks the notification's fulfilments to find every
  party entry with an `addressId`; `unknown-obligation` `$push`es a
  fulfilment keyed on an id the current manifest deliberately does not
  know. `assembleFulfilments` can't help either case: it only emits ids
  the current registry contains, which is precisely what
  `unknown-obligation` needs to sidestep.

Every scenario carries a sanity check that fires if its sentinel has
lost its meaning:

- `country-stale`'s `assertBogus` fails if the ISO code `ZZ` ever ends
  up in the current catalogue.
- `unknown-obligation`'s `assertUnknown` fails if the ghost obligation
  id ever gets adopted by a real obligation.
- `party-deleted` — the sanity is in the test tier (see below): a unit
  test pins that every party role sourced from `PARTIES` + `CONTACT_PARTY`
  resolves to a real obligation id, so a future role that lands in the
  frontend without a matching obligation makes the scenario fail loud.

## Tests

The scope is deliberately narrow: **do the staleness mechanisms work?** For
each scenario that means "run it, end up with the promised stale state on
a real Mongo document". Filter shapes, error messages, self-check guards
etc. are implementation, verified in use rather than in isolation.

All the tests live in `scenarios/stale-scenarios.integration.test.js`.

### Smoke suite (gated by `LIVE_ANIMALS_IT=testcontainer`)

Spins up one real MongoDB container via `testcontainers` (already a
devDependency for the Redis IT), shared across all three scenarios, and
for each asserts:

- **The mutation lands.** The document is in the target stale state.
- **Other fulfilments are untouched.** Scenarios don't over-match.
- **Idempotency.** A second run leaves the same terminal state.

Run with:

```sh
LIVE_ANIMALS_IT=testcontainer npm test
```

Or narrow to just this file:

```sh
LIVE_ANIMALS_IT=testcontainer npx vitest run dev-tools/staleness-tools/scenarios/stale-scenarios.integration.test.js
```

Gated because Docker is a prerequisite and container startup takes a
couple of seconds. The frontend's own CI runs `npm test` without the
flag, so the smoke suite skips on main; run it locally before touching
a scenario.

### Data source integrity (not gated — runs on main CI)

One always-on describe in the same file pins that every role name in
`PARTIES` + `CONTACT_PARTY` resolves to an obligation. That drift —
adding a role without a matching obligation entry — is one the smoke
suite cannot catch (it seeds specific obligation ids). This fires on
main CI before anyone runs the tool.

The other scenarios' sanity checks (`assertBogus` / `assertUnknown`)
fire at runtime inside the scenario itself — a sentinel that has lost
its meaning errors loudly on first invocation, so a separate test
would duplicate what the runtime guard already does.

## Adding a scenario

- New file at `scenarios/<id>.js` exporting `{ id, summary, mutate(notifications, referenceNumber) }`.
- Add it to the barrel at `scenarios/index.js`.
- Add a `describe('#<yourScenario>', () => { ... })` block to `stale-scenarios.integration.test.js` proving the mutation lands, doesn't over-match, and is idempotent. Follow the shape of the existing three.
- If the scenario has a sentinel — a value or id chosen to be nonsense
  under today's reference data / manifest — add an assertion that fires
  when it becomes meaningful, or a test that pins it. Losing the ability
  to simulate the thing you claim to simulate is the single failure mode
  worth spending code on guarding.

## Related

- Companion seeder: `bin/seed-notification.ts` on
  `trade-imports-animals-tests` — produces a DRAFT / SUBMITTED / AMEND
  notification the staleness tool can then mutate.
- Workspace notes on the underlying stale-state design conversation:
  `~/git/defra/trade-imports-workspace/workareas/shared/eudpa-573-stale-state/notes.md`
- Handover doc explaining why this tool lives here rather than in the
  tests repo:
  `~/git/defra/trade-imports-workspace/workareas/shared/stale-state-seed-in-frontend/plan.md`
- Ticket plan for the port itself:
  `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-634/plan.md`
