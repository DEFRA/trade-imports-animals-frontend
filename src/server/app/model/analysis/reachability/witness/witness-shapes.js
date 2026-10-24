import { WITNESS_KIND } from './kinds.js'

export const valueWitness = (meta, value) => ({
  kind: WITNESS_KIND.WITNESS,
  obligationId: meta.obligationId,
  value,
  gatedParentGroupId: meta.gatedParentGroupId ?? null
})

export const firstListedValueWitness = (meta, emptyReason) => {
  if (!Array.isArray(meta.values) || meta.values.length === 0) {
    return { kind: WITNESS_KIND.OPAQUE, reason: emptyReason }
  }
  return valueWitness(meta, meta.values[0])
}

export const firstListedPairWitness = (meta, emptyReason) => {
  const witness = firstListedValueWitness(meta, emptyReason)
  return witness.kind === WITNESS_KIND.WITNESS
    ? { ...witness, pairedObligationId: meta.pairedObligationId }
    : witness
}

export const isTotalBranchGate = (meta) =>
  meta.whenTrue?.inScope === true && meta.whenFalse?.inScope === true

export const totalBranchWitnessOrValue = (meta, makeWitness) =>
  isTotalBranchGate(meta) ? { kind: WITNESS_KIND.TRIVIAL } : makeWitness()
