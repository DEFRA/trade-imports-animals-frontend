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
  cancelAmend: {
    link: 'Cancel amendment',
    successTitle: 'Success',
    successBody:
      'The amendment has been cancelled and the submitted version restored.'
  },
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
  // Shown inside the uploaded-documents card when nothing has been uploaded.
  // The card itself always stands, so it needs a line rather than an empty box.
  documentsEmpty: 'You have not added any documents yet.',
  // What each Change link names once a screen reader reaches it. Cards carry
  // the only Change links on the page, so a card's entry here reads as the rest
  // of "Change ..." — lower case, and the card's own title in words.
  hidden: {
    cards: {
      importDetails: 'import details',
      additionalAnimalDetails: 'additional animal details',
      arrivalDetails: 'arrival details',
      transitCountries: 'countries the consignment will travel through',
      transportDetails: 'transport details',
      rolesAndAddresses: 'roles and addresses',
      contactAddress: 'contact address for this consignment',
      documents: 'uploaded documents'
    },
    commodity: (n) => `commodity ${n}`
  },
  submit: {
    heading: 'Now submit your notification',
    body: 'Continue to the declaration to submit your notification.',
    button: 'Continue'
  },
  errors: {
    prefix: 'Error:',
    // One line per review card that still has answers outstanding. The same
    // line carries the error summary entry and the message inside the card, so
    // a trader reading either sees the same words.
    cards: {
      importDetails: 'Complete import details',
      additionalAnimalDetails: 'Complete additional animal details',
      species: 'Complete species details',
      arrivalDetails: 'Complete arrival details',
      transportDetails: 'Complete transport details',
      rolesAndAddresses: 'Complete roles and addresses',
      contactAddress: 'Complete contact address for this consignment',
      documents: 'Complete documents'
    },
    parties: {
      placeOfOrigin: 'Select an address for the place of origin',
      consignor: 'Select an address for the consignor',
      consignee: 'Select an address for the consignee',
      importer: 'Select an address for the importer',
      placeOfDestination: 'Select an address for the place of destination'
    }
  }
}
