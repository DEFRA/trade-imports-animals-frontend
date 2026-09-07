import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact } from '../../shared/compact.js'

const asPartyRef = (answer) =>
  answer?.addressId ? { addressId: answer.addressId } : undefined

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
