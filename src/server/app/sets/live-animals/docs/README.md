# Live-animals set and linear journey documentation

The live-animals set supplies the obligation manifest, commodity reference data and
the linear trader journey. The shared application platform is documented in the
[platform index](../../../docs/README.md).

## Run and test

Run commands from the repository root.

```bash
npm run dev
npm run test:live-animals
npm test
PORT=3050 npm run test:features
npm run test:e2e
```

`npm run test:live-animals` runs only tests under
`src/server/app/sets/live-animals`. Use `npm test` for L1 composition, bridge,
convention and full-suite coverage.

## Set and journey guides

- [Obligation set](obligation-model.md)
- [Feature anatomy](features.md)
- [Journey flow and gates](journey-flow-and-gates.md)
- [Set-owned services](services.md)
- [Live-animals limits](limits.md)
- [Testing the set and journey](testing.md)
- [Lighthouse](lighthouse.md)

## Recipes

- [Add a field](add-a-field.md)
- [Add a page](add-a-page.md)
- [Add a feature group, flow section and task row](add-a-section.md)
- [Add a repeatable collection](add-a-collection.md)

## Platform guides used by this set

- [Architecture](../../../docs/architecture.md)
- [Engine](../../../docs/engine.md)
- [Flow machinery](../../../docs/flow-and-gates.md)
- [Scope and wipe](../../../docs/scope-and-wipe.md)
- [Validation](../../../docs/validation.md)
- [Persistence](../../../docs/persistence.md)
- [Collection cardinality](../../../docs/cardinality.md)
- [Testing the platform](../../../docs/testing.md)
