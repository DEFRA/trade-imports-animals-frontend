import { INDEX_DELIMITER } from '../../../obligations/index-delimiter.js'

const lineFulfilments = (witness) =>
  witness.pairedObligationId
    ? {
        [witness.obligationId]: { line1: witness.value[0] },
        [witness.pairedObligationId]: { line1: witness.value[1] }
      }
    : { [witness.obligationId]: { line1: witness.value } }

export const witnessFulfilments = (obligation, witness) => {
  const fulfilmentIndexesByObligationId = new Map()
  if (witness.gatedParentGroupId) {
    fulfilmentIndexesByObligationId.set(witness.gatedParentGroupId, [
      ['line1', 'unit1'].join(INDEX_DELIMITER)
    ])
    return {
      fulfilments: lineFulfilments(witness),
      fulfilmentIndexesByObligationId
    }
  }
  const gateType = obligation.applyTo.metadata?.gateType
  if (gateType === 'allowListed' || gateType === 'notInUnionOf') {
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
