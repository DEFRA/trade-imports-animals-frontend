import { buildImplication } from './index.js'

// Build per-obligation implications by invoking `buildImplication`
// for each obligation in the manifest.
//
// Returns `Object<obligationId, implication>`.
export function buildImplications(obligations, context) {
  const implicationsByObligation = {}
  for (const obligation of obligations) {
    implicationsByObligation[obligation.id] = buildImplication(
      obligation,
      context
    )
  }
  return implicationsByObligation
}
