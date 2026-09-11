import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact } from '../../shared/compact.js'
import { isoFromDateParts } from '../../shared/iso-date.js'

/** Persist a party answer with inline details when an address-book id is present. */
const asInlineParty = (answer) => {
  if (!answer?.addressId) {
    return answer
  }
  return compact({
    addressId: answer.addressId,
    name: answer.name,
    email: answer.email,
    phone: answer.phone,
    address: answer.address
  })
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
    exitDate: isoFromDateParts(reader.scalar(exitDate))
  })
}
