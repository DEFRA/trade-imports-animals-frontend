import {
  grossVolume,
  grossVolumeUnit,
  totalGrossWeight
} from './sections/additional-details.js'
import { commodityInputMethod } from './sections/commodities/input-method.js'
import {
  commodityLines,
  commoditySelection,
  controlledAtmosphereContainer,
  finishedOrPropagated,
  intendedForFinalUsers,
  netWeight,
  numberOfPackages,
  packageType,
  quantity,
  quantityType,
  testAndTrial
} from './sections/commodities/lines.js'
import {
  eppoCode,
  genusAndSpecies,
  species,
  speciesId
} from './sections/commodities/species.js'
import {
  varieties,
  variety,
  varietyClass
} from './sections/commodities/varieties.js'
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
  totalGrossWeight,
  grossVolume,
  grossVolumeUnit,
  commodityInputMethod,
  commodityLines,
  commoditySelection,
  numberOfPackages,
  packageType,
  quantity,
  quantityType,
  netWeight,
  controlledAtmosphereContainer,
  finishedOrPropagated,
  intendedForFinalUsers,
  testAndTrial,
  species,
  eppoCode,
  genusAndSpecies,
  speciesId,
  varieties,
  variety,
  varietyClass,
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
  commodityLines,
  commoditySelection,
  numberOfPackages,
  packageType,
  quantity,
  quantityType,
  netWeight,
  controlledAtmosphereContainer,
  finishedOrPropagated,
  intendedForFinalUsers,
  testAndTrial,
  species,
  eppoCode,
  genusAndSpecies,
  speciesId,
  varieties,
  variety,
  varietyClass,
  totalGrossWeight,
  grossVolume,
  grossVolumeUnit,
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
  enforcedAtContinue: ['countryOfOrigin', 'commoditySelection'],
  maxEntriesFrom: {},
  systemAnswerKeys: ['referenceNumber']
}
