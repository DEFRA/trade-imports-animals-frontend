/**
 * An obligation's gate metadata with its `dependsOn`: an explicit `dependsOn`
 * array on the obligation first, otherwise derived from `applyTo.metadata`,
 * otherwise `undefined`.
 *
 * @param {object} obligation - the manifest entry.
 * @returns {object} the gate metadata plus `dependsOn`.
 */
export const obligationMetadata = (obligation) => {
  const gateMetadata = obligation?.applyTo?.metadata ?? {}
  const explicitDependsOn = obligation?.dependsOn
  const dependsOn = Array.isArray(explicitDependsOn)
    ? explicitDependsOn
    : deriveDependsOn(gateMetadata)
  return { ...gateMetadata, dependsOn }
}

const SINGLE_GATE_TYPES = new Set([
  'allowListed',
  'anyAllowListed',
  'anyNotInUnionOf',
  'notInUnionOf',
  'matches',
  'equalsGate',
  'presentGate',
  'includesGate'
])

const deriveDependsOn = (gateMetadata) => {
  const gateType = gateMetadata?.gateType
  if (SINGLE_GATE_TYPES.has(gateType)) {
    return typeof gateMetadata.obligationId === 'string'
      ? [gateMetadata.obligationId]
      : undefined
  }
  if (gateType === 'allowListedPairs') {
    return [gateMetadata.obligationId, gateMetadata.pairedObligationId]
  }
  if (gateType === 'branchedGate') {
    return typeof gateMetadata.predicateMeta?.obligationId === 'string'
      ? [gateMetadata.predicateMeta.obligationId]
      : undefined
  }
  if (gateType === 'alwaysInScope') {
    return []
  }
  return undefined
}
