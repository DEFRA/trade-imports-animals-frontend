import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact } from '../../shared/compact.js'

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
    reasonForImport
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
    cphNumber: reader.scalar(cph)
  })
}
