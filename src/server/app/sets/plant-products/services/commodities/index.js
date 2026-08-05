import {
  CLASSES_BY_COMMODITY,
  CLASS_LABELS,
  COMMODITY_TREE,
  SPECIES_BY_CODE,
  VARIETIES_BY_COMMODITY
} from './fixture.js'

const descendantsOf = (nodes) =>
  nodes.flatMap((node) => [
    node,
    ...(node.children ? descendantsOf(node.children) : [])
  ])

const ALL_NODES = Object.freeze(descendantsOf(COMMODITY_TREE))
const LEAF_NODES = Object.freeze(
  ALL_NODES.filter(({ children }) => children === undefined)
)
const COMMODITY_CODES = Object.freeze(LEAF_NODES.map(({ code }) => code))
const ALL_SPECIES = Object.freeze(Object.values(SPECIES_BY_CODE).flat())

const normaliseFilter = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

export const commodityTree = () => COMMODITY_TREE

export const childrenOf = (parentCode) => {
  if (parentCode == null) {
    return COMMODITY_TREE
  }

  return ALL_NODES.find(({ code }) => code === parentCode)?.children ?? []
}

export const commodityCodes = () => COMMODITY_CODES

export const isCommodityCode = (code) => COMMODITY_CODES.includes(code)

export const descriptionFor = (code) =>
  LEAF_NODES.find((node) => node.code === code)?.description

export const isPlantsForPlanting = (code) =>
  LEAF_NODES.find((node) => node.code === code)?.plantsForPlanting === true

export const speciesFor = (code) => SPECIES_BY_CODE[code] ?? []

export const genusAndSpeciesFor = (eppoCode) =>
  ALL_SPECIES.find((species) => species.eppoCode === eppoCode)?.genusAndSpecies

export const isSpeciesOf = (code, eppoCode) =>
  speciesFor(code).some((species) => species.eppoCode === eppoCode)

export const searchSpecies = ({ genus, eppoCode } = {}) => {
  const genusFilter = normaliseFilter(genus)
  const eppoCodeFilter = normaliseFilter(eppoCode)

  return Object.entries(SPECIES_BY_CODE).flatMap(
    ([commodityCode, speciesEntries]) =>
      speciesEntries
        .filter(
          (species) =>
            species.genusAndSpecies.toLowerCase().includes(genusFilter) &&
            species.eppoCode.toLowerCase().startsWith(eppoCodeFilter)
        )
        .map((species) => ({ commodityCode, ...species }))
  )
}

export const varietiesFor = (commodityCode, eppoCode) =>
  VARIETIES_BY_COMMODITY[commodityCode]?.[eppoCode] ?? []

export const varietyLabelFor = (commodityCode, eppoCode, varietyId) =>
  varietiesFor(commodityCode, eppoCode).find(({ id }) => id === varietyId)
    ?.label

export const classesFor = (commodityCode) =>
  CLASSES_BY_COMMODITY[commodityCode] ?? []

export const classApplicableCommodities = () =>
  Object.keys(CLASSES_BY_COMMODITY)

export const classLabelFor = (classCode) => CLASS_LABELS[classCode]

export const hasVarieties = (commodityCode, eppoCode) =>
  varietiesFor(commodityCode, eppoCode).length > 0
