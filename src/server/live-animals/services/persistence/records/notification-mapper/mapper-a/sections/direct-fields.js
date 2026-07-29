import {
  consignee,
  consignor,
  contactAddress,
  cph,
  importer,
  placeOfDestination,
  placeOfOrigin,
  reasonForImport
} from '../../../../../../model/obligations/obligations.js'
import { compact } from '../../shared/compact.js'

export const directFieldsFromFulfilment = (reader, referenceNumber) =>
  compact({
    referenceNumber,
    reasonForImport: reader.scalar(reasonForImport),
    placeOfOrigin: reader.scalar(placeOfOrigin),
    consignor: reader.scalar(consignor),
    consignee: reader.scalar(consignee),
    importer: reader.scalar(importer),
    destination: reader.scalar(placeOfDestination),
    consignment: reader.scalar(contactAddress),
    cphNumber: reader.scalar(cph)
  })
