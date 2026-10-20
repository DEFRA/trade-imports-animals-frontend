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
