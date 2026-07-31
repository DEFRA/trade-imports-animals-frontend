import { commodityCodeFor } from '../commodity-reference.js'
import {
  baseComplementFromGroup,
  commodityFromLinesA
} from '../mapper-a/commodity.js'
import { compact } from '../shared/compact.js'
import { groupLinesByCommodity } from '../shared/lines/group-by-commodity.js'
import { speciesLines } from '../shared/lines/species-lines.js'

export const targetUnit = (unit) =>
  compact({
    passport: unit.animalIdentifierPassport,
    tattoo: unit.animalIdentifierTattoo,
    earTag: unit.animalIdentifierEarTag,
    horseName: unit.horseName,
    identificationDetails: unit.animalIdentifierIdentificationDetails,
    description: unit.animalIdentifierDescription,
    permanentAddress: unit.permanentAddress
  })

// Mapper A's grouped commodity, with each complement enriched by the extra
// commodityCode + per-group name (so every group keeps its commodity
// identity, not just the first) and each species entry carrying the line's
// FULL identifier records — the lossless per-species shape.
export const targetComplementFromGroup = (group) => {
  const base = baseComplementFromGroup(group)
  const name = group[0].commoditySelection
  const withSpecies = speciesLines(group)
  return compact({
    commodityCode:
      name === undefined ? undefined : (commodityCodeFor(name) ?? name),
    name,
    ...base,
    species: base.species?.map((entry, index) =>
      compact({
        ...entry,
        animalIdentifiers: withSpecies[index].animalIdentifiers?.map(targetUnit)
      })
    )
  })
}

export const targetCommodityFromLines = (lines) => {
  const base = commodityFromLinesA(lines)
  if (!base) return undefined
  return {
    ...base,
    commodityComplement: groupLinesByCommodity(lines).map(
      targetComplementFromGroup
    )
  }
}
