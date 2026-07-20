import { obligations } from '../model/obligations/obligations.js'

const templatePathOf = (obligation) => {
  const names = []
  let current = obligation
  while (current) {
    names.unshift(current.name)
    current = current.within
  }
  return names.join('.')
}

export function* walkObligations() {
  for (const obligation of obligations) {
    yield { templatePath: templatePathOf(obligation), obligation }
  }
}

const byNameMap = new Map(obligations.map((o) => [o.name, o]))

export const obligationByName = (name) => byNameMap.get(name)

// Resolve an obligation by its dotted name-path — the `within` chain of names,
// root to leaf, joined by `.` (`commodityLines`,
// `commodityLines.animalIdentifiers`).
const byPathMap = new Map(obligations.map((o) => [templatePathOf(o), o]))

export const obligationByPath = (templatePath) => byPathMap.get(templatePath)

export const SYSTEM_POPULATED = new Set([
  'poApprovedReferenceNumber',
  'responsiblePersonForLoad',
  'commodityType'
])

export const ENFORCED_AT_CONTINUE = new Set([
  'countryOfOrigin',
  'commoditySelection'
])

// Collection admission-control cap: a collection's entry count is
// capped at the value of a sibling count field in the frame that holds it.
// Enforcement lives on the write path (engine/evaluate/cardinality.js
// `collectionCapAt`, appendEntryAt rejects at the cap); only
// the declaration lives here. Keyed by collection name → sibling count field.
export const MAX_ENTRIES_FROM = {
  animalIdentifiers: 'numberOfAnimalsQuantity'
}
