# Architecture decisions

## Pages are the journey spine

A page descriptor has an `id`, a `slug` and page-owned `collects`. The same identity
is used by dispatch, gates and navigation. Controllers and the journey flow import
the descriptor; `page.js` stays import-free to avoid cycles.

## Shared code is a library

Controllers call small functions from `shared/`, `lib/`, `engine/` and `flow/`.
Those modules do not discover features or import a set. L1 supplies set and journey
policy through explicit configuration seams.

## The model owns applicability; the journey owns sequence

The obligation evaluator decides what is in scope and whether it is mandatory or
optional. Journey sections decide page order. Task rows decide how work is grouped
on a hub. Keeping these facts separate allows another journey style to reuse the
same obligation set.

## Gates are derived by default

[`src/server/app/flow/gates.js`](../flow/gates.js) derives normal page and section
gates from dispatch ownership, scope and prerequisites. Authored gates are reserved
for journey policy that the derived rule cannot represent.

## One obligation has one page owner

[`src/server/app/flow/dispatch.js`](../flow/dispatch.js) rejects duplicate and
missing ownership. Collection depth is derived through manifest and binding paths,
so a page normally claims the collection root rather than each nested leaf.

## The model has no display copy

Obligations contain stable domain identity, scope, mandate and invariants. Journeys
own labels, hints, options, validation messages and templates. Boot-time purity
checks reject display-shaped keys in the model.

## The bridge is the model-to-page seam

[`src/server/app/bridge/fulfilment-bindings.js`](../bridge/fulfilment-bindings.js)
defines scalar and grouped bindings. L1 registers a journey's binding bundles with
the generic bridge, which projects canonical fulfilment without importing journey
code.

## Composition is explicit

[`src/server/app/routes.js`](../routes.js) is allowed to know which set and journey
exist. Model, bridge, engine and flow accept their concrete policy through
`configureObligationSet`, `configureFulfilmentRegistry`, `configureJourneyFlow`,
`configureRecords` and `configureSession`.
