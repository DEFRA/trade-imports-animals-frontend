export const copy = {
  title: 'Review your notification',
  resubmittingTitle: 'Review before re-submitting',
  missing: 'Missing',
  yesNo: { yes: 'Yes', no: 'No' },
  change: 'Change',
  cancelAmend: {
    successTitle: 'Success',
    successBody:
      'The amendment has been cancelled and the submitted version restored.'
  },
  sections: {
    aboutTheConsignment: '1. About the consignment',
    descriptionOfTheGoods: '2. Description of the goods',
    transportAndArrival: '3. Transport and arrival',
    documents: '4. Uploaded documents',
    consignmentAddresses: '5. Consignment addresses',
    contactAddress: '6. Contact address'
  },
  cards: {
    originOfImport: 'Origin of import',
    mainImportReason: 'Main import reason',
    whatAreYouImporting: 'What are you importing?',
    additionalDetails: 'Additional details',
    arrivalDetails: 'Arrival details',
    transportDetails: 'Transport details',
    addresses: 'Addresses',
    contactAddress: 'Contact address'
  },
  groups: {
    transitCountries: 'Transit countries',
    permanentAddress: 'Permanent address'
  },
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
    speciesCommonName: 'Common name',
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
  identificationDetails: {
    animalColumn: 'Animal',
    heading: 'Identification details'
  },
  documentN: (n) => `Document ${n}`,
  hidden: {
    cards: {
      originOfImport: 'origin of import',
      mainImportReason: 'main import reason',
      whatAreYouImporting: 'what are you importing',
      additionalDetails: 'additional details',
      arrivalDetails: 'arrival details',
      transportDetails: 'transport details',
      addresses: 'addresses',
      contactAddress: 'contact address'
    },
    document: (n) => `document ${n}`,
    rows: {
      transitCountries: 'transit countries'
    },
    commodity: (title) => `commodity ${title}`,
    numberOfAnimals: (species) => `number of animals for ${species}`,
    identificationDetails: (species) => `identification details for ${species}`
  },
  submit: {
    button: 'Continue'
  },
  errors: {
    prefix: 'Error:',
    cards: {
      originOfImport: 'Complete origin of import',
      mainImportReason: 'Complete main import reason',
      additionalDetails: 'Complete additional details',
      whatAreYouImporting: 'Complete what are you importing?',
      commodityDetails: 'Complete commodity details',
      arrivalDetails: 'Complete arrival details',
      transportDetails: 'Complete transport details',
      addresses: 'Complete roles and addresses',
      contactAddress: 'Complete contact address for this consignment',
      documents: 'Complete documents'
    },
    species: {
      noCount: (species) => `Enter the number of animals for ${species}`,
      noIdentifier: (species) =>
        `Enter at least 1 animal identifier for ${species}`,
      notListed: (speciesWithCodes) =>
        `${speciesWithCodes} can no longer be selected. Select a species from the list.`
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
