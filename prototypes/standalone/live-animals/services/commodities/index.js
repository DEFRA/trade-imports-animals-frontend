import {
  COMMODITY_OPTIONS,
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

/** The commodity picklist, in reference-data order — for select options and validation membership. */
export const list = () => COMMODITY_OPTIONS

/** The commodity-type reference list as select options, in reference-data order. */
export const types = () => TYPE_OPTIONS

/** Display label for a commodity-type code (undefined when the code is unknown). */
export const typeLabel = (code) =>
  TYPE_OPTIONS.find((option) => option.value === code)?.text

/** The species reference list as select options, in reference-data order. */
export const species = () => SPECIES_OPTIONS

/** Display label for a species code (undefined when the code is unknown). */
export const speciesLabel = (code) =>
  SPECIES_OPTIONS.find((option) => option.value === code)?.text

/** Commodities that owe a package count (the V4 "number of packages" list). */
export const packageCountCommodities = () => PACKAGE_COUNT_COMMODITIES

/** Commodities whose animal identifier is a passport. */
export const passportCommodities = () => PASSPORT_COMMODITIES

/** Commodities whose animal identifier is a tattoo. */
export const tattooCommodities = () => TATTOO_COMMODITIES

/** Commodities whose animal identifier is an ear tag. */
export const earTagCommodities = () => EAR_TAG_COMMODITIES

/** Commodities identified by horse name. */
export const horseNameCommodities = () => HORSE_NAME_COMMODITIES

/** Commodities that owe a per-animal permanent address. */
export const permanentAddressCommodities = () => PERMANENT_ADDRESS_COMMODITIES

/** Commodities that put containsUnweanedAnimals in scope. */
export const unweanedCommodities = () => UNWEANED_ANIMAL_COMMODITIES

/** Commodities that put countyParishHoldingCph in scope. */
export const cphCommodities = () => CPH_COMMODITIES
