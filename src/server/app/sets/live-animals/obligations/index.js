import { arrivalDateAtPort, portOfEntry } from './sections/arrival.js'
import {
  cph,
  containsUnweanedAnimals
} from './sections/commodities/aggregates.js'
import {
  earTag,
  horseName,
  microchip,
  passport,
  permanentAddress,
  tattoo,
  unitRecord
} from './sections/commodities/identifiers.js'
import {
  commodityCode,
  commodityLine,
  commodityType,
  speciesCommonName,
  numberOfAnimals,
  numberOfPackages,
  speciesLatinName
} from './sections/commodities/lines.js'
import {
  accompanyingDocumentAttachmentType,
  accompanyingDocumentDateOfIssue,
  accompanyingDocumentReference,
  accompanyingDocumentType,
  documentFilename,
  documents,
  documentUploadId
} from './sections/documents.js'
import {
  destinationCountry,
  exitDate,
  portOfExit,
  purposeInInternalMarket,
  reasonForImport
} from './sections/import-reason.js'
import {
  animalsCertifiedFor,
  contactAddress,
  internalReferenceNumber
} from './sections/misc.js'
import {
  countryOfOrigin,
  countryOfOriginSubdivisionCode,
  regionCode,
  regionCodeRequirement
} from './sections/origin.js'
import {
  consignee,
  consignor,
  importer,
  placeOfDestination,
  placeOfOrigin
} from './sections/parties.js'
import { poApprovedReferenceNumber } from './sections/system.js'
import {
  commercialTransporter,
  meansOfTransport,
  privateTransporter,
  transitedCountries,
  transportDocumentReference,
  transporterType,
  transportIdentification
} from './sections/transport.js'

export {
  accompanyingDocumentAttachmentType,
  accompanyingDocumentDateOfIssue,
  accompanyingDocumentReference,
  accompanyingDocumentType,
  animalsCertifiedFor,
  arrivalDateAtPort,
  commodityCode,
  commodityLine,
  commodityType,
  commercialTransporter,
  speciesCommonName,
  consignee,
  consignor,
  contactAddress,
  containsUnweanedAnimals,
  countryOfOrigin,
  countryOfOriginSubdivisionCode,
  cph,
  destinationCountry,
  documentFilename,
  documents,
  documentUploadId,
  earTag,
  exitDate,
  horseName,
  importer,
  internalReferenceNumber,
  meansOfTransport,
  microchip,
  numberOfAnimals,
  numberOfPackages,
  passport,
  permanentAddress,
  placeOfDestination,
  placeOfOrigin,
  poApprovedReferenceNumber,
  portOfEntry,
  portOfExit,
  privateTransporter,
  purposeInInternalMarket,
  reasonForImport,
  regionCode,
  regionCodeRequirement,
  speciesLatinName,
  tattoo,
  transitedCountries,
  transportDocumentReference,
  transporterType,
  transportIdentification,
  unitRecord
}

export const obligations = [
  poApprovedReferenceNumber,
  countryOfOrigin,
  countryOfOriginSubdivisionCode,
  regionCodeRequirement,
  regionCode,
  reasonForImport,
  purposeInInternalMarket,
  destinationCountry,
  portOfExit,
  exitDate,
  containsUnweanedAnimals,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  transporterType,
  commercialTransporter,
  privateTransporter,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  arrivalDateAtPort,
  portOfEntry,
  contactAddress,
  internalReferenceNumber,
  animalsCertifiedFor,
  commodityLine,
  commodityCode,
  commodityType,
  speciesLatinName,
  speciesCommonName,
  numberOfAnimals,
  numberOfPackages,
  cph,
  unitRecord,
  microchip,
  passport,
  tattoo,
  earTag,
  horseName,
  permanentAddress,
  documents,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue,
  documentUploadId,
  documentFilename
]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)
