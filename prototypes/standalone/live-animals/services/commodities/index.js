import {
  COMMODITY_OPTIONS,
  COMMODITY_CODES,
  COMMODITY_SPECIES,
  SPECIES_OPTIONS,
  PACKAGE_COUNT_COMMODITIES,
  PASSPORT_COMMODITIES,
  TATTOO_COMMODITIES,
  EAR_TAG_COMMODITIES,
  HORSE_NAME_COMMODITIES,
  PERMANENT_ADDRESS_COMMODITIES,
  UNWEANED_ANIMAL_COMMODITIES,
  CPH_COMMODITIES
} from './stub.js'

export const list = () => COMMODITY_OPTIONS

export const commodityCodeFor = (name) => COMMODITY_CODES[name]

export const commodityNameFor = (code) =>
  Object.keys(COMMODITY_CODES).find((name) => COMMODITY_CODES[name] === code)

export const species = () => SPECIES_OPTIONS

export const speciesLabel = (code) =>
  SPECIES_OPTIONS.find((option) => option.value === code)?.text

export const speciesFor = (name) => COMMODITY_SPECIES[name] ?? []

export const isCommoditySpecies = (name, value) =>
  speciesFor(name).some((option) => option.value === value)

/**
 * Search the commodity reference data by common name, commodity code or
 * species (scientific name). Returns whole commodity groups — matching a
 * species surfaces its commodity with all of that commodity's species.
 * @param {string} query
 * @returns {Array<{name: string, code: string, species: object[]}>}
 */
const commodityMatchesQuery = (name, normalisedQuery) => {
  const code = COMMODITY_CODES[name] ?? ''
  return (
    name.toLowerCase().includes(normalisedQuery) ||
    code.toLowerCase().includes(normalisedQuery) ||
    speciesFor(name).some((option) =>
      option.text.toLowerCase().includes(normalisedQuery)
    )
  )
}

const toSearchResult = (name) => ({
  name,
  code: COMMODITY_CODES[name],
  species: speciesFor(name)
})

export const search = (query) => {
  const normalisedQuery = (query ?? '').trim().toLowerCase()
  if (normalisedQuery === '') return []
  return COMMODITY_OPTIONS.filter((name) =>
    commodityMatchesQuery(name, normalisedQuery)
  ).map(toSearchResult)
}

export const packageCountCommodities = () => PACKAGE_COUNT_COMMODITIES

export const passportCommodities = () => PASSPORT_COMMODITIES

export const tattooCommodities = () => TATTOO_COMMODITIES

export const earTagCommodities = () => EAR_TAG_COMMODITIES

export const horseNameCommodities = () => HORSE_NAME_COMMODITIES

export const permanentAddressCommodities = () => PERMANENT_ADDRESS_COMMODITIES

export const unweanedCommodities = () => UNWEANED_ANIMAL_COMMODITIES

export const cphCommodities = () => CPH_COMMODITIES
