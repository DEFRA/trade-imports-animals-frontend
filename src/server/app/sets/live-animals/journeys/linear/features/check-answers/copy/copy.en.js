export const copy = {
  title: 'Review your notification',
  notApplicable: 'Not applicable',
  missing: 'Missing',
  yesNo: { yes: 'Yes', no: 'No' },
  documentTypes: {
    ITAHC: 'Intra Trade Animal Health Certificate (ITAHC)',
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
  editDetails: 'Edit details',
  cancelAmend: {
    successTitle: 'Success',
    successBody:
      'The amendment has been cancelled and the submitted version restored.'
  },
  sections: {
    aboutTheConsignment: '1. About the consignment',
    descriptionOfTheGoods: '2. Description of the goods',
    transportAndArrival: '3. Transport and arrival',
    documents: '4. Documents',
    consignmentParties: '5. Consignment parties',
    contactAddress: '6. Contact address'
  },
  groups: {
    whereFrom: 'Where is this consignment coming from?',
    mainImportReason: 'Main import reason',
    commodityDetails: 'Commodity details',
    additionalDetails: 'Additional details',
    arrivalDetails: 'Arrival details',
    transitCountries: 'Transit countries',
    transportDetails: 'Transport details',
    uploadDocuments: 'Upload documents',
    rolesAndAddresses: 'Roles and addresses',
    contactAddress: 'Contact address for this consignment'
  },
  cards: {
    importDetails: 'Import details',
    reasonForImport: 'Reason for import',
    additionalAnimalDetails: 'Additional animal details',
    arrivalDetails: 'Arrival details',
    transitCountries: 'Transit countries',
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
    destinationCountry: 'Destination country',
    exitDate: 'Exit date',
    portOfExit: 'Port of exit',
    commodityCode: 'Commodity code',
    commonName: 'Common name',
    species: 'Species',
    numberOfAnimals: 'Number of animals',
    numberOfPackages: 'Number of packages',
    portOfEntry: 'Port of entry',
    arrivalDate: 'Arrival date at port of entry',
    meansOfTransport: 'Means of transport to the port of entry',
    transitedCountries: 'Countries that the consignment will travel through',
    transportIdentification: 'Transport identification',
    transportDocumentReference: 'Transport document reference',
    name: 'Name',
    address: 'Address',
    contactAddress: 'Contact address',
    country: 'Country',
    approvalNumber: 'Approval number',
    type: 'Type',
    placeOfOrigin: 'Place of origin',
    consignor: 'Consignor',
    consignee: 'Consignee',
    importer: 'Importer',
    placeOfDestination: 'Place of destination',
    cph: 'County parish holding (CPH) number',
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
  documentsEmpty: 'You have not added any documents yet.',
  hidden: {
    cards: {
      importDetails: 'import details',
      reasonForImport: 'reason for import',
      additionalAnimalDetails: 'additional animal details',
      arrivalDetails: 'arrival details',
      transitCountries: 'transit countries',
      transportDetails: 'transport details',
      rolesAndAddresses: 'roles and addresses',
      contactAddress: 'contact address for this consignment',
      documents: 'uploaded documents'
    },
    commodity: (n) => `commodity ${n}`
  },
  submit: {
    button: 'Continue'
  },
  errors: {
    prefix: 'Error:',
    cards: {
      importDetails: 'Complete import details',
      reasonForImport: 'Complete reason for import',
      additionalAnimalDetails: 'Complete additional animal details',
      species: 'Complete species details',
      arrivalDetails: 'Complete arrival details',
      transitCountries: 'Complete transit countries',
      transportDetails: 'Complete transport details',
      rolesAndAddresses: 'Complete roles and addresses',
      contactAddress: 'Complete contact address for this consignment',
      documents: 'Complete documents'
    },
    parties: {
      placeOfOrigin: 'Correct the address details for the place of origin',
      consignor: 'Correct the address details for the consignor',
      consignee: 'Correct the address details for the consignee',
      importer: 'Correct the address details for the importer',
      placeOfDestination:
        'Correct the address details for the place of destination',
      contactAddress: 'Correct the contact address details for this consignment'
    }
  }
}
