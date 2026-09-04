import { buildImplication } from './index.js'

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
