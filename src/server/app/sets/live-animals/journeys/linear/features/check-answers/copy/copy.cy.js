// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Adolygu eich hysbysiad',
  resubmittingTitle: 'Adolygu cyn ailgyflwyno',
  missing: 'Ar goll',
  yesNo: { yes: 'Iawn', no: 'Na' },
  change: 'Newid',
  cancelAmend: {
    successTitle: 'Llwyddiant',
    successBody:
      'Mae’r diwygiad wedi’i ganslo ac mae’r fersiwn a gyflwynwyd wedi’i hadfer.'
  },
  sections: {
    aboutTheConsignment: '1. Am y llwyth',
    descriptionOfTheGoods: '2. Disgrifiad o’r nwyddau',
    transportAndArrival: '3. Cludiant a chyrraedd',
    documents: '4. Dogfennau wedi’u huwchlwytho',
    consignmentAddresses: '5. Cyfeiriadau’r llwyth',
    contactAddress: '6. Cyfeiriad cyswllt'
  },
  cards: {
    originOfImport: 'Tarddiad y mewnforio',
    mainImportReason: 'Prif reswm mewnforio',
    whatAreYouImporting: 'Beth ydych chi’n ei fewnforio?',
    additionalDetails: 'Manylion ychwanegol',
    arrivalDetails: 'Manylion cyrraedd',
    transportDetails: 'Manylion cludo',
    addresses: 'Cyfeiriadau',
    contactAddress: 'Cyfeiriad cyswllt'
  },
  groups: {
    transitCountries: 'Gwledydd tramwy',
    permanentAddress: 'Cyfeiriad parhaol'
  },
  rows: {
    countryOfOrigin: 'Gwlad tarddiad',
    regionCode: 'Cod rhanbarth tarddiad',
    internalReference: 'Cyfeirnod mewnol',
    certifiedFor: 'Wedi’i ardystio ar gyfer',
    unweaned: 'Yn cynnwys anifeiliaid heb eu diddyfnu',
    reasonForImport: 'Prif reswm mewnforio',
    purpose: 'Diben yn y farchnad',
    destinationCountry: 'Gwlad gyrchfan',
    exitDate: 'Dyddiad ymadael',
    portOfExit: 'Porthladd ymadael',
    exitBorderControlPost: 'Safle rheoli ffiniau ymadael',
    commodityCode: 'Cod nwyddau',
    speciesCommonName: 'Enw cyffredin',
    species: 'Rhywogaeth',
    numberOfAnimals: 'Nifer yr anifeiliaid',
    numberOfPackages: 'Nifer y pecynnau (pan fo angen)',
    portOfEntry: 'Porthladd mynediad',
    arrivalDate: 'Dyddiad cyrraedd y gyrchfan',
    meansOfTransport: 'Cyfrwng cludo i’r porthladd mynediad',
    transitedCountries: 'Gwledydd y bydd y llwyth yn teithio drwyddynt',
    transportIdentification: 'Adnabod y cludiant',
    transportDocumentReference: 'Cyfeirnod dogfen cludo',
    name: 'Enw',
    address: 'Cyfeiriad',
    contactAddress: 'Cyfeiriad cyswllt',
    country: 'Gwlad',
    approvalNumber: 'Rhif cymeradwyo',
    type: 'Math',
    placeOfOrigin: 'Man tarddiad',
    consignor: 'Anfonwr',
    consignee: 'Derbynnydd',
    importer: 'Mewnforiwr',
    placeOfDestination: 'Man cyrchfan',
    cph: 'Rhif daliad plwyf sirol (CPH)',
    documentReference: 'Cyfeirnod y ddogfen',
    documentType: 'Math o ddogfen',
    dateOfIssue: 'Dyddiad cyhoeddi',
    attachment: 'Atodiad'
  },
  identificationDetails: {
    animalColumn: 'Anifail',
    heading: 'Manylion adnabod'
  },
  documentN: (n) => `Dogfen ${n}`,
  hidden: {
    cards: {
      originOfImport: 'tarddiad y mewnforio',
      mainImportReason: 'prif reswm mewnforio',
      whatAreYouImporting: 'beth ydych chi’n ei fewnforio',
      additionalDetails: 'manylion ychwanegol',
      arrivalDetails: 'manylion cyrraedd',
      transportDetails: 'manylion cludo',
      addresses: 'cyfeiriadau',
      contactAddress: 'cyfeiriad cyswllt'
    },
    document: (n) => `dogfen ${n}`,
    rows: {
      transitCountries: 'gwledydd tramwy'
    },
    commodity: (title) => `nwydd ${title}`,
    numberOfAnimals: (species) => `nifer yr anifeiliaid ar gyfer ${species}`,
    identificationDetails: (species) => `manylion adnabod ar gyfer ${species}`
  },
  submit: {
    button: 'Parhau'
  },
  errors: {
    prefix: 'Gwall:',
    cards: {
      originOfImport: 'Cwblhewch darddiad y mewnforio',
      mainImportReason: 'Cwblhewch y prif reswm mewnforio',
      additionalDetails: 'Cwblhewch y manylion ychwanegol',
      whatAreYouImporting: 'Cwblhewch beth ydych chi’n ei fewnforio',
      commodityDetails: 'Cwblhewch fanylion y nwyddau',
      arrivalDetails: 'Cwblhewch y manylion cyrraedd',
      transportDetails: 'Cwblhewch y manylion cludo',
      addresses: 'Cwblhewch y rolau a’r cyfeiriadau',
      contactAddress: 'Cwblhewch y cyfeiriad cyswllt ar gyfer y llwyth hwn',
      documents: 'Cwblhewch y dogfennau'
    },
    species: {
      noCount: (species) => `Rhowch nifer yr anifeiliaid ar gyfer ${species}`,
      noIdentifier: (species) =>
        `Rhowch o leiaf 1 dynodwr anifail ar gyfer ${species}`,
      notListed: (speciesWithCodes) =>
        `Ni ellir dewis ${speciesWithCodes} mwyach. Dewiswch rywogaeth o'r rhestr.`
    },
    parties: {
      placeOfOrigin: 'Cywirwch fanylion y cyfeiriad ar gyfer y man tarddiad',
      consignor: 'Cywirwch fanylion y cyfeiriad ar gyfer yr anfonwr',
      consignee: 'Cywirwch fanylion y cyfeiriad ar gyfer y derbynnydd',
      importer: 'Cywirwch fanylion y cyfeiriad ar gyfer y mewnforiwr',
      placeOfDestination:
        'Cywirwch fanylion y cyfeiriad ar gyfer y man cyrchfan',
      contactAddress:
        'Cywirwch fanylion y cyfeiriad cyswllt ar gyfer y llwyth hwn'
    }
  }
}
