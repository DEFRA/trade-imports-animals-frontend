# Provenance

Vendored copy of `prototypes/standalone/obligations-v2-spike` at commit
`1d0a904` (branch `spike/EUDPA-249-obligations-v2-improvements`, post
T1–T11 cleanup pipeline), renamed to `live-animals` (config BASE,
TEMPLATES, plugin name, template layout paths).

The car-insurance domain (`features/`, `registry.js`, `flow/flow.js`,
`lib/quote.js`, hub/check-answers content, engine-test fixtures) shipped as
the WORKING BASELINE and was replaced section-by-section by the real
live-animals journey defined in `spec/journey-spec.json`. The engine's
test net stayed green throughout. inc-028 removed the last car features
(the quote and confirmation features and `lib/quote.js`), so no car-domain
feature remains — the journey is purely live-animals. inc-029 re-points the
remaining engine-test fixtures at the live-animals domain.

Engine/flow/lib/shared divergences from the spike are recorded in
`DESIGN-DELTA.md` (created on first divergence), not merged back.
