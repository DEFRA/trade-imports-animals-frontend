import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { instantFromDateParts } from '../../../../../../lib/validate/index.js'
import { compact, orUndefined } from '../../shared/compact.js'

/** Persist a party answer as its copied details — never an address-book id, so
 * the backend has nothing to resolve. An answer with no details to copy (a
 * bare id left from before addresses were copied) is no party at all. */
const asInlineParty = (answer) =>
  orUndefined(
    compact({
      name: answer?.name,
      email: answer?.email,
      phone: answer?.phone,
      address: answer?.address
    })
  )

export const directFieldsFromFulfilment = (reader, referenceNumber) => {
  const {
    consignee,
    consignor,
    contactAddress,
    cph,
    importer,
    placeOfDestination,
    placeOfOrigin,
    reasonForImport,
    purposeInInternalMarket,
    destinationCountry,
    portOfExit,
    exitDate
  } = obligationSet()
  return compact({
    referenceNumber,
    reasonForImport: reader.scalar(reasonForImport),
    placeOfOrigin: asInlineParty(reader.scalar(placeOfOrigin)),
    consignor: asInlineParty(reader.scalar(consignor)),
    consignee: asInlineParty(reader.scalar(consignee)),
    importer: asInlineParty(reader.scalar(importer)),
    destination: asInlineParty(reader.scalar(placeOfDestination)),
    consignment: asInlineParty(reader.scalar(contactAddress)),
    cphNumber: reader.scalar(cph),
    purposeInInternalMarket: reader.scalar(purposeInInternalMarket),
    destinationCountry: reader.scalar(destinationCountry),
    portOfExit: reader.scalar(portOfExit),
    exitDate: instantFromDateParts(reader.scalar(exitDate))
  })
}
