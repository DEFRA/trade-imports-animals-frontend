// The `{ fulfilments, fulfilmentIndexes }` pair that feeds the real `applyTo`
// closure for a fidelity check. Depth-N gates (allowListed with a
// projection group, e.g. passport / tattoo projecting onto unitRecord)
// need a synthetic instance path seeded in `fulfilmentIndexes` or
// `filterAndProject` returns `records: []` regardless of the value.
// Depth-1 `allowListed`/`notInUnionOf` still read as a map; every other
// helper accepts a plain scalar.
export const witnessFulfilments = (obligation, witness) => {
  const fulfilmentIndexesByObligationId = new Map()
  if (witness.projection) {
    fulfilmentIndexesByObligationId.set(witness.projection, ['line1.unit1'])
    return {
      fulfilments: { [witness.obligationId]: { line1: witness.value } },
      fulfilmentIndexesByObligationId
    }
  }
  const metaType = obligation.applyTo.metadata?.type
  if (metaType === 'allowListed' || metaType === 'notInUnionOf') {
    return {
      fulfilments: { [witness.obligationId]: { line1: witness.value } },
      fulfilmentIndexesByObligationId
    }
  }
  return {
    fulfilments: { [witness.obligationId]: witness.value },
    fulfilmentIndexesByObligationId
  }
}
