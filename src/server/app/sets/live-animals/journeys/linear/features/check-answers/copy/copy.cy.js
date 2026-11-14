// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Adolygu eich hysbysiad',
  missing: 'Ar goll',
  yesNo: { yes: 'Iawn', no: 'Na' },
  change: 'Newid',
  editDetails: 'Golygu manylion',
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
    additionalDetails: 'Manylion ychwanegol',
    arrivalDetails: 'Manylion cyrraedd',
    transportDetails: 'Manylion cludo',
    addresses: 'Cyfeiriadau',
    contactAddress: 'Cyfeiriad cyswllt',
    documents: 'Dogfennau wedi’u huwchlwytho'
  },
  groups: {
    transitCountries: 'Gwledydd tramwy'
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
    numberOfPackages: 'Nifer y pecynnau',
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
    attachmentType: 'Math o atodiad'
  },
  identifierTable: {
    animalColumn: 'Anifail',
    animalN: (n) => `Anifail ${n}`,
    heading: 'Manylion yr anifeiliaid'
  },
  documentN: (n) => `Dogfen ${n}`,
  documentsEmpty: 'Nid ydych wedi ychwanegu unrhyw ddogfennau eto.',
  hidden: {
    cards: {
      originOfImport: 'tarddiad y mewnforio',
      mainImportReason: 'prif reswm mewnforio',
      additionalDetails: 'manylion ychwanegol',
      arrivalDetails: 'manylion cyrraedd',
      transportDetails: 'manylion cludo',
      addresses: 'cyfeiriadau',
      contactAddress: 'cyfeiriad cyswllt',
      documents: 'dogfennau wedi’u huwchlwytho'
    },
    rows: {
      transitCountries: 'gwledydd tramwy'
    },
    commodity: (n) => `nwydd ${n}`
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
      species: 'Cwblhewch fanylion y rhywogaeth',
      arrivalDetails: 'Cwblhewch y manylion cyrraedd',
      transportDetails: 'Cwblhewch y manylion cludo',
      addresses: 'Cwblhewch y rolau a’r cyfeiriadau',
      contactAddress: 'Cwblhewch y cyfeiriad cyswllt ar gyfer y llwyth hwn',
      documents: 'Cwblhewch y dogfennau'
    },
    species: {
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
