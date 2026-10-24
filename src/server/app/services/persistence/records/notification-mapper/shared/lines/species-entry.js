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

export const speciesEntryFromLine = (line) => {
  const identifierUnits = line.animalIdentifiers ?? []
  const firstUnit = identifierUnits[0] ?? {}
  return compact({
    value: line.speciesLatinName,
    text: line.speciesLatinName,
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
