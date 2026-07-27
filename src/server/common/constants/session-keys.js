/**
 * Single source of truth for session storage keys. Add a new entry here before referencing it in a controller; keys are camelCase and the value must match the property name.
 */
export const sessionKeys = Object.freeze({
  referenceNumber: 'referenceNumber',
  countryCode: 'countryCode',
  requiresRegionCode: 'requiresRegionCode',
  internalReference: 'internalReference',
  certifiedFor: 'certifiedFor',
  unweanedAnimals: 'unweanedAnimals',
  portOfEntry: 'portOfEntry',
  arrivalDate: 'arrivalDate',
  meansOfTransport: 'meansOfTransport',
  transportIdentification: 'transportIdentification',
  transportDocumentReference: 'transportDocumentReference',
  transitedCountries: 'transitedCountries',
  commodity: 'commodity',
  contactAddress: 'contactAddress',
  consignmentContactAddress: 'consignmentContactAddress',
  reasonForImport: 'reasonForImport',
  transporter: 'transporter',
  placeOfOrigin: 'placeOfOrigin',
  consignor: 'consignor',
  consignee: 'consignee',
  importer: 'importer',
  destination: 'destination',
  cphNumber: 'cphNumber',
  documents: 'documents'
})
