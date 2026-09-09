import { speciesLabel } from '../../commodity-reference.js'
import { compact } from '../compact.js'
import { toWireAddress } from '../../../../../address-book/to-wire-address.js'

// Journey-shape permanent address → backend ConsignmentParty wire shape.
// permanentAddress is the one address-collecting path in the journey that
// bypasses answerForInlineParty and stores journey naming directly
// (postalOrZipCode/telephoneNumber/emailAddress) — translate it the same way
// every other party in the service already is, or postcode/phone/email are
// silently dropped by the backend's unknown-property tolerance.
const permanentAddressFrom = (pa) =>
  pa &&
  compact({
    name: pa.name,
    phone: pa.address?.telephoneNumber,
    email: pa.address?.emailAddress,
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

// Species value → display name via the prototype's commodity reference data,
// falling back to the raw value for unknown codes — matching the skeleton's
// `speciesByValue.get(value) ?? value` resolution. The scalar
// earTag/passport/microchip fields still carry only the line's first
// identifier unit (an in-tree hop-2 GBN-AG mapper reads them as scalars);
// `animalIdentifiers` carries every unit on the line, with all 6 per-unit
// fields.
export const speciesEntryFromLine = (line) => {
  const units = line.animalIdentifiers ?? []
  const unit = units[0] ?? {}
  return compact({
    value: line.speciesSelection,
    text: speciesLabel(line.speciesSelection) ?? line.speciesSelection,
    noOfAnimals: line.numberOfAnimalsQuantity,
    noOfPackages: line.numberOfPackages,
    earTag: unit.animalIdentifierEarTag,
    passport: unit.animalIdentifierPassport,
    microchip: unit.animalIdentifierMicrochip,
    animalIdentifiers:
      units.length > 0 ? units.map(animalIdentifierFrom) : undefined
  })
}
