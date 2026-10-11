export const copy = {
  title: 'Review your notification',
  resubmitTitle: 'Review before re-submitting',
  // The line under a submitted notification's reference.
  viewHeader: { dateSubmitted: (date) => `Date submitted: ${date}` },
  // An empty value inside a card that is finished. Nothing more is owed on
  // that card, so the blank is a settled answer rather than a gap.
  notApplicable: 'Not applicable',
  // An empty value inside a card that still has answers outstanding gets no
  // text at all — the row is drawn in the missing style, and this is what a
  // screen reader is told in its place.
  missing: 'Missing',
  yesNo: { yes: 'Yes', no: 'No' },
  means: {
    AIRPLANE: 'Air',
    RAILWAY: 'Rail',
    ROAD_VEHICLE: 'Road',
    VESSEL: 'Sea'
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
  editDetails: 'Edit details',
  cancelAmend: {
    button: 'Cancel amend',
    successTitle: 'Success',
    successBody:
      'The amendment has been cancelled and the submitted version restored.'
  },
  // The six numbered sections of design release 2.1, in its order. The number
  // is part of the heading, so renumbering means editing these strings.
  sections: {
    aboutTheConsignment: '1. About the consignment',
    descriptionOfTheGoods: '2. Description of the goods',
    transportAndArrival: '3. Transport and arrival',
    documents: '4. Uploaded documents',
    consignmentParties: '5. Consignment addresses',
    contactAddress: '6. Contact address'
  },
  cards: {
    importDetails: 'Origin of import',
    whatAreYouImporting: 'What are you importing?',
    reasonForImport: 'Main import reason',
    additionalAnimalDetails: 'Additional details',
    arrivalDetails: 'Arrival details',
    transportDetails: 'Transport details',
    rolesAndAddresses: 'Addresses',
    contactAddress: 'Contact address'
  },
  subsections: { transitCountries: 'Transit countries' },
  rows: {
    countryOfOrigin: 'Country of origin',
    regionCode: 'Region of origin code',
    internalReference: 'Internal reference number',
    certifiedFor: 'Certified for',
    unweaned: 'Includes unweaned animals',
    reasonForImport: 'Main import reason',
    purpose: 'Purpose in the market',
    destinationCountry: 'Destination country',
    exitDate: 'Exit date',
    portOfExit: 'Port of exit',
    exitBorderControlPost: 'Exit border control post',
    commodityCode: 'Commodity code',
    commonName: 'Common name',
    species: 'Species',
    numberOfAnimals: 'Number of animals',
    numberOfPackages: 'Number of packages (when required)',
    portOfEntry: 'Port of entry',
    arrivalDate: 'Arrival date at destination',
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
    attachment: 'Attachment'
  },
  identifierTable: {
    animalColumn: 'Animal',
    permanentAddress: 'Permanent address',
    animalN: (n) => `Animal ${n}`,
    animalNamed: (species, n) => `${species} ${n}`,
    heading: 'Identification details'
  },
  documentN: (n) => `Document ${n}`,
  // What each Change link names once a screen reader reaches it. Cards carry a
  // Change link in the heading, so a card's entry here reads as the rest of
  // "Change ..." — lower case, and the card's own title in words. The transit
  // countries row and the first row of each species block carry one of their own,
  // and the Identification details table of each species block carries one too.
  // Each document card names its own number.
  hidden: {
    cards: {
      importDetails: 'origin of import',
      whatAreYouImporting: 'what are you importing',
      reasonForImport: 'main import reason',
      additionalAnimalDetails: 'additional details',
      arrivalDetails: 'arrival details',
      transportDetails: 'transport details',
      rolesAndAddresses: 'addresses',
      contactAddress: 'contact address'
    },
    // The transit countries row is the one row with a Change link of its own.
    rows: {
      transitedCountries: 'countries that the consignment will travel through'
    },
    numberOfAnimalsFor: (species) => `number of animals for ${species}`,
    documentN: (n) => `document ${n}`,
    identificationDetailsFor: (species) =>
      `identification details for ${species}`
  },
  // The review ends with its buttons and no heading or sentence above them.
  // Continue's label carries the whole instruction.
  submit: {
    button: 'Continue'
  },
  errors: {
    prefix: 'Error:',
    // One line per review card that still has answers outstanding. The same
    // line carries the error summary entry and the message inside the card, so
    // a trader reading either sees the same words.
    cards: {
      importDetails: 'Complete origin of import',
      whatAreYouImporting: 'Complete what are you importing?',
      reasonForImport: 'Complete main import reason',
      commodityDetails: 'Complete commodity details',
      additionalAnimalDetails: 'Complete additional details',
      arrivalDetails: 'Complete arrival details',
      transportDetails: 'Complete transport details',
      rolesAndAddresses: 'Complete roles and addresses',
      contactAddress: 'Complete contact address for this consignment',
      documents: 'Complete documents'
    },
    // A species of a multi-species consignment that is still short of what
    // submit needs, named in lower case. Summary entries only: the species
    // block itself is not marked.
    species: {
      numberOfAnimals: (species) =>
        `Enter the number of animals for ${species}`,
      atLeastOneIdentifier: (species) =>
        `Enter at least 1 animal identifier for ${species}`
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
