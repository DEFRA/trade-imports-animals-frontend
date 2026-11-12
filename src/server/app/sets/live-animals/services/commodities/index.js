import {
  COMMODITY_DESCRIPTIONS,
  COMMODITY_IDENTIFIERS,
  COMMODITY_NAMES_BY_CODE,
  CPH_EXEMPT_CODES,
  EAR_TAG_CODES,
  HORSE_NAME_CODE_SPECIES,
  IDENTIFIED_CODES,
  identifierNameOf,
  MICROCHIP_CODES,
  PACKAGE_COUNT_CODES,
  PASSPORT_CODES,
  PERMANENT_ADDRESS_CODE_SPECIES,
  PER_SPECIES_CODE,
  TATTOO_CODES,
  UNWEANED_CODES
} from './rules.js'

export const listsSpeciesIndividually = (code) => code === PER_SPECIES_CODE

export const packageCountCommodityCodes = () => PACKAGE_COUNT_CODES

export const identifiersFor = (code) =>
  (COMMODITY_IDENTIFIERS[code] ?? []).map(identifierNameOf)

export const commodityDescriptionFor = (code) => COMMODITY_DESCRIPTIONS[code]

export const commodityNameFor = (code) => COMMODITY_NAMES_BY_CODE[code]

export const microchipCommodityCodes = () => MICROCHIP_CODES

export const passportCommodityCodes = () => PASSPORT_CODES

export const tattooCommodityCodes = () => TATTOO_CODES

export const earTagCommodityCodes = () => EAR_TAG_CODES

export const horseNameCodeSpecies = () => HORSE_NAME_CODE_SPECIES

export const identifiedCommodityCodes = () => IDENTIFIED_CODES

export const needsIdentifying = (line) =>
  IDENTIFIED_CODES.includes(line?.commodityCode)

export const permanentAddressCodeSpecies = () => PERMANENT_ADDRESS_CODE_SPECIES

export const unweanedCommodityCodes = () => UNWEANED_CODES

export const cphExemptCommodityCodes = () => CPH_EXEMPT_CODES
