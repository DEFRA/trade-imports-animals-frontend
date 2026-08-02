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
