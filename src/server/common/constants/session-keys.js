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
  commodity: 'commodity',
  contactAddress: 'contactAddress',
  consignmentContactAddress: 'consignmentContactAddress',
  reasonForImport: 'reasonForImport',
  transporter: 'transporter',
  consignor: 'consignor',
  destination: 'destination',
  cphNumber: 'cphNumber',
  documents: 'documents'
})
