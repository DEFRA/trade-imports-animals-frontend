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

export const SYSTEM_POPULATED = new Set([
  'poApprovedReferenceNumber',
  'responsiblePersonForLoad',
  'commodityType'
])

export const ENFORCED_AT_CONTINUE = new Set([
  'countryOfOrigin',
  'commoditySelection'
])
