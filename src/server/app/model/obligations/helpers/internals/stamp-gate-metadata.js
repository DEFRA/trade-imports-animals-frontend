export const stampGateMetadata = (
  gate,
  { gateType, gateObligation, currentValues, ...fields }
) => {
  gate.metadata = { gateType, obligationId: gateObligation.id, ...fields }
  Object.defineProperty(gate.metadata, 'values', {
    enumerable: true,
    get: currentValues
  })
  return gate
}
