import {
  commodityNameFor,
  speciesCommonName,
  speciesLatinName
} from '../../commodity-reference.js'
import { compact } from '../compact.js'
import { toWireAddress } from '../../../../../address-book/to-wire-address.js'

// Journey-shape permanent address → backend ConsignmentParty wire shape. The
// journey keeps phone and email inside the address block; the backend keeps
// them on the party, and drops any field it does not know.
const permanentAddressFrom = (pa) =>
  pa &&
  compact({
    name: pa.name,
    phone: pa.address?.phone,
    email: pa.address?.email,
    address: toWireAddress(pa.address)
  })

const animalIdentifierFrom = (unit) =>
  compact({
    microchip: unit.animalIdentifierMicrochip,
    passport: unit.animalIdentifierPassport,
    tattoo: unit.animalIdentifierTattoo,
    earTag: unit.animalIdentifierEarTag,
    horseName: unit.horseName,
    permanentAddress: permanentAddressFrom(unit.permanentAddress)
  })

const speciesValueFrom = (line) =>
  line.speciesLatinName ?? line.speciesSelection

const speciesTextFrom = (line) => {
  if (line.speciesLatinName) {
    return line.speciesLatinName
  }
  if (line.speciesSelection) {
    return speciesLatinName(line.speciesSelection)
  }
  return undefined
}

const commonNameFrom = (line) => {
  if (line.commonName) {
    return line.commonName
  }
  if (line.commoditySelection) {
    return speciesCommonName(line.commoditySelection, speciesValueFrom(line))
  }
  const commodityName = commodityNameFor(line.commodityCode)
  if (commodityName) {
    return speciesCommonName(commodityName, speciesValueFrom(line))
  }
  return undefined
}

// The scalar identifier fields carry the line's first identifier unit;
// `animalIdentifiers` carries every unit on the line.
export const speciesEntryFromLine = (line, { typeOfCommodity } = {}) => {
  const units = line.animalIdentifiers ?? []
  const unit = units[0] ?? {}
  return compact({
    value: speciesValueFrom(line),
    text: speciesTextFrom(line),
    commonName: commonNameFrom(line),
    typeOfCommodity,
    noOfAnimals: line.numberOfAnimalsQuantity,
    noOfPackages: line.numberOfPackages,
    earTag: unit.animalIdentifierEarTag,
    passport: unit.animalIdentifierPassport,
    microchip: unit.animalIdentifierMicrochip,
    animalIdentifiers:
      units.length > 0 ? units.map(animalIdentifierFrom) : undefined
  })
}
