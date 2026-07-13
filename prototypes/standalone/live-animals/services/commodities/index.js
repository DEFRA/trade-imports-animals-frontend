import {
  COMMODITY_OPTIONS,
  COMMODITY_CODES,
  TYPE_OPTIONS,
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

export const types = () => TYPE_OPTIONS

export const typeLabel = (code) =>
  TYPE_OPTIONS.find((option) => option.value === code)?.text

export const species = () => SPECIES_OPTIONS

export const speciesLabel = (code) =>
  SPECIES_OPTIONS.find((option) => option.value === code)?.text

export const packageCountCommodities = () => PACKAGE_COUNT_COMMODITIES

export const passportCommodities = () => PASSPORT_COMMODITIES

export const tattooCommodities = () => TATTOO_COMMODITIES

export const earTagCommodities = () => EAR_TAG_COMMODITIES

export const horseNameCommodities = () => HORSE_NAME_COMMODITIES

export const permanentAddressCommodities = () => PERMANENT_ADDRESS_COMMODITIES

export const unweanedCommodities = () => UNWEANED_ANIMAL_COMMODITIES

export const cphCommodities = () => CPH_COMMODITIES
