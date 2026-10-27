import {
  COMMODITY_IDENTIFIERS,
  CPH_EXEMPT_CODES,
  EAR_TAG_CODES,
  HORSE_NAME_CODES,
  IDENTIFIED_CODES,
  MICROCHIP_CODES,
  PACKAGE_COUNT_CODES,
  PASSPORT_CODES,
  PERMANENT_ADDRESS_CODE_SPECIES,
  PER_SPECIES_CODE,
  TATTOO_CODES,
  UNWEANED_CODES,
  typeFor,
  typesFor
} from './rules.js'

export const typeIdFor = (code, latinName) => typeFor(code, latinName).id

export const typeTextForId = (code, typeId) =>
  typesFor(code).find((type) => type.id === typeId)?.text

export const listsSpeciesIndividually = (code) => code === PER_SPECIES_CODE

export const packageCountCommodityCodes = () => PACKAGE_COUNT_CODES

export const identifiersFor = (code) => COMMODITY_IDENTIFIERS[code] ?? []

export const microchipCommodityCodes = () => MICROCHIP_CODES

export const passportCommodityCodes = () => PASSPORT_CODES

export const tattooCommodityCodes = () => TATTOO_CODES

export const earTagCommodityCodes = () => EAR_TAG_CODES

export const horseNameCommodityCodes = () => HORSE_NAME_CODES

export const identifiedCommodityCodes = () => IDENTIFIED_CODES

export const needsIdentifying = (line) =>
  IDENTIFIED_CODES.includes(line?.commodityCode)

export const permanentAddressCodeSpecies = () => PERMANENT_ADDRESS_CODE_SPECIES

export const unweanedCommodityCodes = () => UNWEANED_CODES

export const cphExemptCommodityCodes = () => CPH_EXEMPT_CODES
