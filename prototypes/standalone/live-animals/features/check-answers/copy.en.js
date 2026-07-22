export const copy = {
  title: 'Check your answers',
  notProvided: 'Not provided',
  yesNo: { yes: 'Yes', no: 'No' },
  means: {
    AIRPLANE: 'Airplane',
    RAILWAY: 'Railway',
    ROAD_VEHICLE: 'Road Vehicle',
    VESSEL: 'Vessel'
  },
  documentTypes: {
    ITAHC: 'ITAHC',
    VETERINARY_HEALTH_CERTIFICATE: 'Veterinary health certificate',
    AIR_WAYBILL: 'Air waybill',
    IMPORT_PERMIT: 'Import permit',
    LETTER_OF_AUTHORITY: 'Letter of authority (Directive 2008/61/EC)',
    COMMERCIAL_INVOICE: 'Commercial invoice',
    SEA_WAYBILL: 'Sea waybill',
    RAIL_WAYBILL: 'Rail waybill',
    BILL_OF_LADING: 'Bill of lading',
    CATCH_CERTIFICATE: 'Catch certificate',
    LABORATORY_SAMPLING_RESULTS_FOR_AFLATOXIN:
      'Laboratory sampling results for aflatoxin (Reg 2019/1793)',
    HEALTH_CERTIFICATE: 'Health certificate',
    JOURNEY_LOG: 'Journey log',
    OTHER: 'Other'
  },
  change: 'Change',
  sections: {
    aboutTheConsignment: '1. About the consignment',
    movement: '2. Movement',
    addresses: '3. Addresses',
    documents: '4. Documents'
  },
  groups: {
    consignmentDetails: 'Consignment details',
    commodityDetails: 'Commodity details',
    species: 'Species'
  },
  cards: {
    importDetails: 'Import details',
    additionalAnimalDetails: 'Additional animal details',
    arrivalDetails: 'Arrival details',
    transportDetails: 'Transport details',
    rolesAndAddresses: 'Roles and addresses',
    contactAddress: 'Contact address for this consignment',
    documents: 'Uploaded documents'
  },
  rows: {
    countryOfOrigin: 'Country of origin',
    regionCodeRequired: 'Region of origin code required',
    regionCode: 'Region of origin code',
    internalReference: 'Internal reference number',
    certifiedFor: 'Certified for',
    unweaned: 'Includes unweaned animals',
    reasonForImport: 'Reason for import',
    purpose: 'Purpose in the market',
    commodityCode: 'Commodity code',
    commonName: 'Common name',
    species: 'Species',
    numberOfAnimals: 'Number of animals',
    numberOfPackages: 'Number of packages',
    portOfEntry: 'Port of entry',
    arrivalDate: 'Arrival date at port of entry',
    meansOfTransport: 'Means of transport',
    transitedCountries: 'Countries that the consignment will travel through',
    transportIdentification: 'Transport identification',
    transportDocumentReference: 'Transport document reference',
    name: 'Name',
    address: 'Address',
    country: 'Country',
    approvalNumber: 'Approval number',
    type: 'Type',
    placeOfOrigin: 'Place of origin',
    consignor: 'Consignor',
    consignee: 'Consignee',
    importer: 'Importer',
    placeOfDestination: 'Place of destination',
    cph: 'County Parish Holding number (CPH)',
    documentReference: 'Document reference',
    documentType: 'Document type',
    dateOfIssue: 'Date of issue',
    attachmentType: 'Attachment type'
  },
  identifierTable: {
    animalColumn: 'Animal',
    permanentAddress: 'Permanent address',
    animalN: (n) => `Animal ${n}`,
    heading: 'Animal details'
  },
  documentN: (n) => `Document ${n}`,
  hidden: {
    transporterName: 'transporter name',
    transporterAddress: 'transporter address',
    transporterCountry: 'transporter country',
    transporterApprovalNumber: 'transporter approval number',
    transporterType: 'transporter type',
    contactAddress: 'contact address',
    documents: 'documents',
    commodity: (n) => `commodity ${n}`,
    identifiersForCommodity: (n) => `animal identifiers for commodity ${n}`
  },
  submit: {
    heading: 'Now submit your notification',
    body: 'Continue to the declaration to submit your notification.',
    button: 'Continue'
  }
}
