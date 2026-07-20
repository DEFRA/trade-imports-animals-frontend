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

// B-native counterpart of A's `registry.byPath` (registry.js): resolve a B
// obligation by its dotted name-path — the `within` chain of names, root to
// leaf, joined by `.` (`commodityLines`, `commodityLines.animalIdentifiers`).
// A keys its map by the same id-path grammar (A id === B name), so this yields
// the same lookups without reading A's obligation objects.
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
