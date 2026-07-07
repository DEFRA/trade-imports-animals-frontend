# Provenance

Vendored copy of `prototypes/standalone/obligations-v2-spike` at commit
`1d0a904` (branch `spike/EUDPA-249-obligations-v2-improvements`, post
T1–T11 cleanup pipeline), renamed to `live-animals` (config BASE,
TEMPLATES, plugin name, template layout paths).

The car-insurance domain (`features/`, `registry.js`, `flow/flow.js`,
`lib/quote.js`, hub/check-answers content, engine-test fixtures) ships as
the WORKING BASELINE and is replaced section-by-section by the real
live-animals journey defined in `spec/journey-spec.json`. The engine's
test net stays green throughout; the final skeleton-parity increment
removes the last car features and re-points test fixtures at the
live-animals domain.

Engine/flow/lib/shared divergences from the spike are recorded in
`DESIGN-DELTA.md` (created on first divergence), not merged back.
