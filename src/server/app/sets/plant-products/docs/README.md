# Plant-products set charter

This set was scaffolded by [the add-a-set recipe](../../../docs/add-a-set.md),
step 1. It owns the CHED-PP journey for plants, plant products and other
objects. Set-specific obligations, flow, copy and services stay below
`sets/plant-products/`; reusable machinery stays in L2.

## Co-residency contract

Live animals and plant products boot in one Node process. Their gateways are
registered separately and symmetrically:

- `live-animals` mounts at `/live-animals`
- `plant-products` mounts at `/plant-products`
- no set owns `/`; the server-wide route temporarily redirects it with a 302
  to `/live-animals`
- health, signout, authentication and static-asset routes remain unprefixed

There is no served-set environment variable or boot selector. Every
`configure*` seam is keyed by set id. Hapi selects the owning plugin realm and
its sandboxed `onPreAuth` extension enters that set's asynchronous context;
because authentication may cross an async boundary, the gateway also runs its
guard and route handlers inside `withSetContext`. The application does not
infer a set from URL text, and server-wide routes remain outside every set
context.

The mount is always `'/' + setId`, not a choice recorded in a second table.
Plant journey cookies have plant-prefixed names and path `/plant-products`, so
they cannot overwrite or expose a live-animals session.

The three names are resolved through `knownJourneysCookie()`,
`openingRunCookie()` and `flowOnlyAnswersCookie()` inside the active set
context. The plant entry guard is registered in the plant plugin realm, so it
cannot run for a live-animals route.

These decisions implement SIBLING-SET-PLAN FD-1, FD-14, FD-15, the R7 reversal
of FD-16, and FD-18/FD-19. The wider decision record and rejected alternatives
remain in that plan rather than being duplicated here.

## Service containment

The scaffold owns its records adapter under this set. It does not import the
L2 live-animals records mapper, countries service or ports service, and its
gateway neither configures live-animals commodity reference data nor primes
live-animals caches. A plant-context call into that mapper therefore fails
loudly because no plant slot exists.

The longer-term option remains to retire the L2 live-animals mapper into
`sets/live-animals/services/`; this increment does not move it.

## Scaffold boundary and follow-ups

- pp-008 supplies the real CHED-PP records adapter and mapper. Until then,
  real mode throws rather than silently selecting the stub.
- pp-010 supplies the plant-scoped unit/convention harness and completes the
  dependency-cruiser `sets-not-l1` widening.
- pp-011 supplies the plant Playwright project and scripts that execute the
  co-located feature specs.

The m0 review flow section deliberately has no pages. The hub renders its
Review and submit entry as unavailable and without a link until pp-038 adds
the review surfaces.

## Copy idempotency

pp-008 delivered the plant records adapter's copy idempotency support ahead of
the rendered action, and pp-054 supplied the matching backend header and global
key index. This closes pp-008's warning that `POST …/copies` could mint two
drafts when a copy action was submitted twice.

When pp-045 renders a Copy action, it must follow all five rules:

1. Mint a `randomUUID()` per rendered Copy action: once per dashboard row and
   once per review-page render, never at module or process scope. The
   live-animals exemplars are `features/dashboard/view-model/row/actions.js`
   and the defaulted `copyIdempotencyKey` option in
   `features/check-answers/controller.js`.
2. Carry that key in a hidden input named exactly `idempotencyKey`, as the
   live-animals dashboard and check-answers templates do.
3. In the POST controller, read
   `request.payload?.idempotencyKey?.trim()` and pass the value as the fourth
   argument to `copyJourney(request, h, journeyId, idempotencyKey)`. The L2
   seam in `engine/journey.js` already carries it; no L2 change is needed.
4. On a recoverable failure, re-render with the same key so a retry returns a
   copy the backend may already have made. The exemplar is `recoverCopy` in
   `features/notification-actions/controller.js`.
5. Build the form action and post-copy redirect as prefix-bearing links with
   `pagePath()`, `hubPath()` or `dashboardPath()`, never with route-shape
   builders or a hand-written `/notifications/…` or `/`. Under symmetric
   mounts, a bare `/` sends a plant user to live-animals. The exemplar is the
   link-builder use in the live-animals dashboard action and notification
   actions controller.

Where a surface renders more than one Copy control, each accessible name must
identify its notification reference. The live-animals dashboard template does
this with visually hidden row-reference copy. Plant text for that distinction,
like every user-facing string, belongs in both `copy.en.js` and `copy.cy.js`
with identical structure, not in obligations or the model.

Both `services/records/real.js` and `services/records/stub.js` reject a missing
or blank key before a network call or store read. Their dedupe contract follows
the shipped backend: the key is global, so replaying it against a different
source returns the first copy. Callers prevent accidental cross-source reuse by
minting a fresh key for every rendered action.

## Standing defaults (recorded once — not per-page ACs)

All downstream plant-products pages inherit these defaults:

- c-018: validation uses one canonical, single-layer Joi-voice message per
  field (`Enter the …` or `Select the …`). Backend-style `Add the …` variants
  are not used.
- c-004: every error summary uses the GDS title `There is a problem`.
- c-014: radio and fieldset pages put the H1 inside the legend, with the
  caption above it.
- the three plant session cookies are path-scoped to `/plant-products`, and
  their names are read through the L2 accessors rather than captured module
  constants.
- the plant entry guard is realm-scoped and never fires on a live-animals
  route.

## Recipe deviations

The m0 scaffold follows add-a-set steps 2, 3, 4, 5, 8 and 9. Its planned
delivery slices steps 6, 7 and 10 across pp-010 and pp-011; this is recorded in
the plan rather than hidden by premature harness or Playwright changes here.
The real adapter is likewise a deliberate pp-008 follow-up, with a loud
not-implemented implementation in this scaffold.

The commodity basic-description surface records these trace-to-requirements
deviations:

- The legacy journey varies the species control by commodity data: a plant
  picker, a machinery checkbox list through the shared non-CHED-PP template,
  or a hidden block when no species reference data exists. Pass 1 builds the
  picker only because every pp-014 fixture association is handled by that
  surface. Re-open the control choice when machinery or no-species commodity
  codes enter the fixture.
- One page renders a card for every commodity line, following the nested-loop
  animal-identification pattern, instead of legacy per-commodity re-entry.
- The fixture lists do not need pagination. Add and Remove use a fixed
  `action` control name with the target in its value, Remove remains available
  for the last species, the conditional Cancel link is omitted, and no species
  cap is declared. The model's collection floor is enforced on Continue.
