import {
  COMMODITY_OPTIONS,
  COMMODITY_CODES,
  COMMODITY_SPECIES,
  COMMODITY_TYPE_DATA,
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

export const typesFor = (name) => COMMODITY_TYPE_DATA[name] ?? []

// The type id whose species list holds this species value — a species belongs
// to exactly one type, so the line's stored commodityType derives from its
// species. Single-type commodities collapse to their one type id.
export const typeIdForSpecies = (name, speciesValue) =>
  typesFor(name).find((type) => type.species.includes(speciesValue))?.id

// The backend-payload text for a stored type id — 'Domestic'/'Game' for Cow,
// blank for the single-type commodities (dropped from the payload).
export const typeTextForId = (name, id) =>
  typesFor(name).find((type) => type.id === id)?.text

export const species = () => SPECIES_OPTIONS

export const speciesLabel = (code) =>
  SPECIES_OPTIONS.find((option) => option.value === code)?.text

export const speciesFor = (name) => COMMODITY_SPECIES[name] ?? []

export const isCommoditySpecies = (name, value) =>
  speciesFor(name).some((option) => option.value === value)

export const packageCountCommodities = () => PACKAGE_COUNT_COMMODITIES

export const passportCommodities = () => PASSPORT_COMMODITIES

export const tattooCommodities = () => TATTOO_COMMODITIES

export const earTagCommodities = () => EAR_TAG_COMMODITIES

export const horseNameCommodities = () => HORSE_NAME_COMMODITIES

export const permanentAddressCommodities = () => PERMANENT_ADDRESS_COMMODITIES

export const unweanedCommodities = () => UNWEANED_ANIMAL_COMMODITIES

export const cphCommodities = () => CPH_COMMODITIES
