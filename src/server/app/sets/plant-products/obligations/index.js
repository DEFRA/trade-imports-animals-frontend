import { commodityInputMethod } from './sections/commodities/input-method.js'
import {
  countryOfConsignment,
  countryOfOrigin,
  internalReference
} from './sections/origin.js'
import { reasonForImport } from './sections/purpose.js'
import {
  arrivalDate,
  arrivalTime,
  borderControlPost,
  containerNumber,
  containers,
  inspectionPremises,
  meansOfTransport,
  officialSeal,
  sealNumber,
  transportDocumentReference,
  transportIdentification,
  usesContainers
} from './sections/transport.js'

export {
  commodityInputMethod,
  countryOfConsignment,
  countryOfOrigin,
  internalReference,
  reasonForImport,
  arrivalDate,
  arrivalTime,
  borderControlPost,
  containerNumber,
  containers,
  inspectionPremises,
  meansOfTransport,
  officialSeal,
  sealNumber,
  transportDocumentReference,
  transportIdentification,
  usesContainers
}

export const obligations = [
  countryOfOrigin,
  countryOfConsignment,
  internalReference,
  reasonForImport,
  commodityInputMethod,
  borderControlPost,
  inspectionPremises,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  arrivalDate,
  arrivalTime,
  usesContainers,
  containers,
  containerNumber,
  sealNumber,
  officialSeal
]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

export const policy = {
  systemPopulated: [],
  enforcedAtContinue: ['countryOfOrigin'],
  maxEntriesFrom: {},
  systemAnswerKeys: ['referenceNumber']
}
