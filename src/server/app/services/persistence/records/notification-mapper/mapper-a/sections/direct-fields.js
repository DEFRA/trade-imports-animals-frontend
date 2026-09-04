import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { countryCodeOf } from '../../../../../countries/index.js'
import { compact, orUndefined } from '../../shared/compact.js'

/** Older origin/contact answers may still be a copy with no address-book id.
 * Those keep their details (and the journey-to-notification address names).
 * Anything with an id is stored as a reference, like the other parties. */
const asPartyRef = (answer) => {
  if (!answer) {
    return answer
  }
  if (answer.addressId) {
    return { addressId: answer.addressId }
  }
  const { name, address = {} } = answer
  return orUndefined(
    compact({
      name,
      email: address.emailAddress,
      phone: address.telephoneNumber,
      address: orUndefined(
        compact({
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          townOrCity: address.townOrCity,
          county: address.county,
          postcode: address.postalOrZipCode,
          countryCode: countryCodeOf(address.country) ?? address.country
        })
      )
    })
  )
}

export const directFieldsFromFulfilment = (reader, referenceNumber) => {
  const {
    consignee,
    consignor,
    contactAddress,
    cph,
    importer,
    placeOfDestination,
    placeOfOrigin,
    reasonForImport
  } = obligationSet()
  return compact({
    referenceNumber,
    reasonForImport: reader.scalar(reasonForImport),
    placeOfOrigin: asPartyRef(reader.scalar(placeOfOrigin)),
    consignor: reader.scalar(consignor),
    consignee: reader.scalar(consignee),
    importer: reader.scalar(importer),
    destination: reader.scalar(placeOfDestination),
    consignment: asPartyRef(reader.scalar(contactAddress)),
    cphNumber: reader.scalar(cph)
  })
}
