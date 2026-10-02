# Notification creation tools

CLIs for spinning up a notification against your local stack — a clean
complete one, or one that has been mutated into a known stale state so
the frontend's amend / review / declaration flow can be walked with
data the reference services no longer recognise.

Written for demoing the review-page validation behaviour (EUDPA-130)
and for reproducing the shonky Amend UX documented in the workspace
notes at `workareas/shared/eudpa-573-stale-state/notes.md`, but useful
for any manual test that wants a real notification without having to
click through the trader UI.

The tools go through the frontend's own save-and-continue routes for
creation (via the tests repo's `SeededJourney`) and direct to Mongo
for the staleness mutations. The mutation path skips the frontend's
write guards deliberately — `records.replaceFulfilment` refuses
SUBMITTED and needs an authenticated organisation actor, neither of
which fits a dev tool.

## Prerequisites

- Workspace compose stack running locally (`tim docker dev` or
  `scripts/stack/run-stack.sh`). MongoDB, backend, and frontend up.
- `MONGODB_URI` reachable at `mongodb://localhost:27017` (the compose
  stack default). Override with the env var if your Mongo is somewhere
  else.
- `../trade-imports-ins-tests` clone as a sibling of this repo
  (the workspace layout). Set `TRADE_IMPORTS_ANIMALS_TESTS_PATH` to
  override.
- `TRADE_IMPORTS_ANIMALS_FRONTEND_BASE_URL` overrides the default
  `http://localhost:3000`.

## Usage

### Create a clean notification

```sh
npm run notification:create
# Seeded draft notification: GBN-AG-26-ABCDEF
# Open: http://localhost:3000/live-animals/notifications/GBN-AG-26-ABCDEF
```

Optional `--state draft|submitted|amend` (default `draft`).

### Create a stale notification (create + apply scenario in one shot)

```sh
npm run notification:create-stale -- --scenario country-stale
# Seeded draft notification: GBN-AG-26-ABCDEF
# Applied country-stale to GBN-AG-26-ABCDEF.
# Open: http://localhost:3000/live-animals/notifications/GBN-AG-26-ABCDEF
```

Same `--state` flag; same URL landing.

### Mutate a notification you already have

```sh
# List scenarios
npm run notification:mutate-stale -- --list

# Apply
npm run notification:mutate-stale -- --scenario country-stale --ref GBN-AG-26-ABCDEF
```

Each scenario is idempotent — a re-run leaves the notification in the same
terminal state. Applying two scenarios to the same notification is
supported but the effects overlap; one scenario per notification gives
the cleanest walk-through. The frontend re-reads the notification on
every request, so no restart is needed after a mutation.

## Stale-state scenarios

| Scenario id          | Simulates                                                                                         | What to look for                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `country-stale`      | Reference-data re-release dropped the ISO code the trader submitted for the country of origin.    | Origin page renders unselected with no explanation. CYA card shows the raw ISO code. Review-page Continue and declaration submit refuse until the trader re-picks.     |
| `unknown-obligation` | An obligation has been removed from the manifest since submit — a fulfilment keyed on it lingers. | Engine's `dropUnrecognisedFulfilments` sweeps the entry out silently on read. Dashboard is unaffected. Amend journey has lost the answer with no user warning surface. |

## Design

### Creation

`create.js` and `create-stale.js` both delegate to the tests repo's
`bin/seed-notification.ts` (an `npm run seed:notification` in the
sibling clone), which uses `SeededJourney` — the same class the E2E
suite uses to POST through the frontend's save-and-continue routes.
Anything the tests keep in sync (page order, required fields, valid
values) flows through automatically.

The seeder skips the accompanying-documents section — file uploads
can't be scripted through form POSTs. So after seeding, the tools
write a minimum four-field document fulfilment straight to Mongo via
`complete-documents.js`, producing the same terminal state a real
upload would.

### Staleness mutations

Each scenario in `stale-state-scenarios/` is a tiny module. Two
shapes are used, one per scenario kind:

- **Answers-space + `assembleFulfilments`** (`country-stale`). The
  scenario says "I want the stored answer to be `{countryOfOrigin: 'ZZ'}`"
  and the frontend's own `assembleFulfilments` produces the fulfilment
  payload the scenario then `$set`s. A future change to how the answer
  is serialised (bare string → object with region metadata, say) flows
  through the assembler without the scenario knowing.
- **Raw fulfilment** (`unknown-obligation`). The scenario operates on
  the fulfilment shape directly: it `$addToSet`s a fulfilment keyed on
  an id the current manifest deliberately does not know.
  `assembleFulfilments` can't help here: it only emits ids the current
  registry contains, which is precisely what `unknown-obligation`
  needs to sidestep.

Every scenario carries a runtime sanity check that fires if its
sentinel has lost its meaning:

- `country-stale`'s `assertBogus` fails if the ISO code `ZZ` ever
  ends up in the current catalogue.
- `unknown-obligation`'s `assertUnknown` fails if the ghost obligation
  id ever gets adopted by a real obligation.

## Tests

The scope is deliberately narrow: **do the staleness mechanisms
work?** For each scenario that means "run it, end up with the promised
stale state on a real Mongo document". Filter shapes, error messages,
self-check guards etc. are implementation, verified in use rather than
in isolation.

All the tests live in
`stale-state-scenarios/stale-scenarios.integration.test.js`.

### Smoke suite (gated by `LIVE_ANIMALS_IT=testcontainer`)

The load-bearing tier. Spins up one real MongoDB container via
`testcontainers` (already a devDependency for the Redis IT), shared
across all three scenarios, and for each asserts:

- **The mutation lands.** The document is in the target stale state.
- **Other fulfilments are untouched.** Scenarios don't over-match.
- **Idempotency.** A second run leaves the same terminal state.

Run with:

```sh
LIVE_ANIMALS_IT=testcontainer npm test
```

Or narrow to just this tool's integration tests:

```sh
LIVE_ANIMALS_IT=testcontainer npx vitest run \
  dev-tools/notification-creation-tools/stale-state-scenarios/stale-scenarios.integration.test.js
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

- New file at `stale-state-scenarios/<id>.js` exporting
  `{ id, summary, mutate(notifications, referenceNumber) }`.
- Add it to the barrel at `stale-state-scenarios/index.js`.
- Add a `describe('#<yourScenario>', () => { ... })` block to
  `stale-scenarios.integration.test.js` proving the mutation lands,
  doesn't over-match, and is idempotent. Follow the shape of the
  existing three.
- If the scenario has a sentinel — a value or id chosen to be
  nonsense under today's reference data / manifest — add an
  assertion that fires when it becomes meaningful, or a test that
  pins it. Losing the ability to simulate the thing you claim to
  simulate is the single failure mode worth spending code on
  guarding.

## Related

- Companion seeder: `bin/seed-notification.ts` on
  `trade-imports-ins-tests` — the create half these tools drive.
- Workspace notes on the underlying stale-state design conversation:
  `~/git/defra/trade-imports-workspace/workareas/shared/eudpa-573-stale-state/notes.md`
- Handover doc explaining why these tools live here rather than in
  the tests repo:
  `~/git/defra/trade-imports-workspace/workareas/shared/stale-state-seed-in-frontend/plan.md`
- Ticket plan for the port itself:
  `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-634/plan.md`
