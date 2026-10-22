import {
  COMMODITY_OPTIONS,
  COMMODITY_CODES,
  COMMODITY_IDENTIFIERS,
  COMMODITY_SPECIES,
  COMMODITY_TYPE_DATA,
  SPECIES_OPTIONS,
  PACKAGE_COUNT_COMMODITIES,
  MICROCHIP_COMMODITIES,
  PASSPORT_COMMODITIES,
  TATTOO_COMMODITIES,
  EAR_TAG_COMMODITIES,
  HORSE_NAME_COMMODITIES,
  IDENTIFIED_COMMODITIES,
  PERMANENT_ADDRESS_COMMODITIES,
  UNWEANED_ANIMAL_COMMODITIES,
  CPH_COMMODITIES,
  CPH_EXEMPT_COMMODITY_CODES
} from './stub.js'

export const list = () => COMMODITY_OPTIONS

export const commodityCodeFor = (name) => COMMODITY_CODES[name]

export const commodityLabel = (name, code) =>
  code ? `${name} (${code})` : name

export const commodityNameFor = (code) =>
  Object.keys(COMMODITY_CODES).find((name) => COMMODITY_CODES[name] === code)

export const typesFor = (name) => COMMODITY_TYPE_DATA[name] ?? []

export const typeIdForSpecies = (name, speciesValue) =>
  typesFor(name).find((type) => type.species.includes(speciesValue))?.id

export const typeTextForId = (name, id) =>
  typesFor(name).find((type) => type.id === id)?.text

export const species = () => SPECIES_OPTIONS

const speciesLabel = (code) =>
  SPECIES_OPTIONS.find((option) => option.value === code)?.text

export const speciesLatinName = (value) => speciesLabel(value) ?? value

export const speciesFor = (name) => COMMODITY_SPECIES[name] ?? []

export const speciesCommonName = (name, value) =>
  speciesFor(name).find((option) => option.value === value)?.commonName ?? name

const PER_SPECIES_COMMODITY_CODE = '01061900'

export const speciesListedIndividually = (name) =>
  commodityCodeFor(name) === PER_SPECIES_COMMODITY_CODE

export const isCommoditySpecies = (name, value) =>
  speciesFor(name).some((option) => option.value === value)

export const packageCountCommodities = () => PACKAGE_COUNT_COMMODITIES

export const identifiersFor = (name) => COMMODITY_IDENTIFIERS[name] ?? []

export const microchipCommodities = () => MICROCHIP_COMMODITIES

export const passportCommodities = () => PASSPORT_COMMODITIES

export const tattooCommodities = () => TATTOO_COMMODITIES

export const earTagCommodities = () => EAR_TAG_COMMODITIES

export const horseNameCommodities = () => HORSE_NAME_COMMODITIES

export const identifiedCommodities = () => IDENTIFIED_COMMODITIES

export const permanentAddressCommodities = () => PERMANENT_ADDRESS_COMMODITIES

export const unweanedCommodities = () => UNWEANED_ANIMAL_COMMODITIES

export const cphCommodities = () => CPH_COMMODITIES

/** The commodity codes exempt from the CPH question. */
export const cphExemptCommodityCodes = () => CPH_EXEMPT_COMMODITY_CODES
