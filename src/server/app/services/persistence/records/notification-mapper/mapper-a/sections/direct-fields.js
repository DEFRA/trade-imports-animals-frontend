import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { countryCodeOf } from '../../../../../countries/index.js'
import { compact, orUndefined } from '../../shared/compact.js'

/** Place of origin and the contact address are held as copies, not references,
 * so unlike the other four roles their details have to cross to the
 * notification rather than being resolved there.
 *
 * Two translations are needed on the way. The journey has carried
 * `postalOrZipCode`/`country` (a display name) since before the address book
 * existed, while the notification uses the address book's own names — the same
 * mapping the address-book client does in `toRequest`. And contact details sit
 * inside the journey's address block but are the party's own fields on a
 * notification.
 *
 * The `addressId` is dropped: it records which row the copy was taken from, so
 * the picker can pre-tick it, and must never reach the notification or the
 * outbox would treat the copy as a live reference.
 *
 * @param {object|undefined} answer an inline party answer, or nothing
 * @returns {object|undefined} the party as the notification holds it
 */
const inlineParty = (answer) => {
  if (!answer) {
    return answer
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
    placeOfOrigin: inlineParty(reader.scalar(placeOfOrigin)),
    consignor: reader.scalar(consignor),
    consignee: reader.scalar(consignee),
    importer: reader.scalar(importer),
    destination: reader.scalar(placeOfDestination),
    consignment: inlineParty(reader.scalar(contactAddress)),
    cphNumber: reader.scalar(cph)
  })
}
