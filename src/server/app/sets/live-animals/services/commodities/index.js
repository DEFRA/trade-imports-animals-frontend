import {
  COMMODITY_IDENTIFIERS,
  CPH_EXEMPT_CODES,
  EAR_TAG_CODES,
  HORSE_NAME_CODES,
  IDENTIFIED_CODES,
  MICROCHIP_CODES,
  PACKAGE_COUNT_CODES,
  PASSPORT_CODES,
  PERMANENT_ADDRESS_SPECIES,
  PER_SPECIES_CODE,
  TATTOO_CODES,
  UNWEANED_CODES,
  typeFor,
  typesFor
} from './rules.js'

// A line's type is decided by its code and species, so every stored line has
// one. Single-type codes collapse to their one type id.
export const typeIdFor = (code, latinName) => typeFor(code, latinName).id

// The backend-payload text for a stored type id — 'Domestic' or 'Game' on
// 0102, blank for the single-type codes (dropped from the payload).
export const typeTextForId = (code, id) =>
  typesFor(code).find((type) => type.id === id)?.text

export const speciesListedIndividually = (code) => code === PER_SPECIES_CODE

export const packageCountCommodities = () => PACKAGE_COUNT_CODES

// The identifiers a code carries, in the order it asks for them.
export const identifiersFor = (code) => COMMODITY_IDENTIFIERS[code] ?? []

export const microchipCommodities = () => MICROCHIP_CODES

export const passportCommodities = () => PASSPORT_CODES

export const tattooCommodities = () => TATTOO_CODES

export const earTagCommodities = () => EAR_TAG_CODES

export const horseNameCommodities = () => HORSE_NAME_CODES

export const identifiedCommodities = () => IDENTIFIED_CODES

export const permanentAddressSpecies = () => PERMANENT_ADDRESS_SPECIES

export const unweanedCommodities = () => UNWEANED_CODES

export const cphExemptCommodityCodes = () => CPH_EXEMPT_CODES
