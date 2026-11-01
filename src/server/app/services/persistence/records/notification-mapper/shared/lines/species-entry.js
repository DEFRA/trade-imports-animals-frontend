import { compact } from '../compact.js'
import { toWireAddress } from '../../../../../address-book/to-wire-address.js'

const partyFromPermanentAddress = (permanentAddress) =>
  permanentAddress &&
  compact({
    name: permanentAddress.name,
    phone: permanentAddress.address?.phone,
    email: permanentAddress.address?.email,
    address: toWireAddress(permanentAddress.address)
  })

const animalIdentifierFrom = (unit) =>
  compact({
    microchip: unit.animalIdentifierMicrochip,
    passport: unit.animalIdentifierPassport,
    tattoo: unit.animalIdentifierTattoo,
    earTag: unit.animalIdentifierEarTag,
    horseName: unit.horseName,
    permanentAddress: partyFromPermanentAddress(unit.permanentAddress)
  })

const commonNameFrom = (line) => line.speciesCommonName || line.commonName

export const speciesEntryFromLine = (line, { typeOfCommodity } = {}) => {
  const identifierUnits = line.animalIdentifiers ?? []
  const firstUnit = identifierUnits[0] ?? {}
  const latinName = line.speciesLatinName
  return compact({
    value: latinName,
    text: latinName,
    commonName: commonNameFrom(line),
    typeOfCommodity,
    noOfAnimals: line.numberOfAnimalsQuantity,
    noOfPackages: line.numberOfPackages,
    earTag: firstUnit.animalIdentifierEarTag,
    passport: firstUnit.animalIdentifierPassport,
    microchip: firstUnit.animalIdentifierMicrochip,
    animalIdentifiers:
      identifierUnits.length > 0
        ? identifierUnits.map(animalIdentifierFrom)
        : undefined
  })
}
