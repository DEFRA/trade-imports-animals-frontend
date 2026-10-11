// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Adolygu eich hysbysiad',
  resubmitTitle: 'Adolygu cyn ailgyflwyno',
  notApplicable: 'Amherthnasol',
  missing: 'Ar goll',
  yesNo: { yes: 'Iawn', no: 'Na' },
  means: {
    AIRPLANE: 'Awyr',
    RAILWAY: 'Rheilffordd',
    ROAD_VEHICLE: 'Ffordd',
    VESSEL: 'Môr'
  },
  documentTypes: {
    ITAHC: 'Tystysgrif Iechyd Anifeiliaid Masnach Fewnol (ITAHC)',
    VETERINARY_HEALTH_CERTIFICATE: 'Tystysgrif iechyd milfeddygol',
    AIR_WAYBILL: 'Bil cludo awyr',
    IMPORT_PERMIT: 'Trwydded fewnforio',
    LETTER_OF_AUTHORITY: 'Llythyr awdurdod (Cyfarwyddeb 2008/61/EC)',
    COMMERCIAL_INVOICE: 'Anfoneb fasnachol',
    SEA_WAYBILL: 'Bil cludo môr',
    RAIL_WAYBILL: 'Bil cludo rheilffordd',
    BILL_OF_LADING: 'Bil llwytho',
    CATCH_CERTIFICATE: 'Tystysgrif dalfa',
    LABORATORY_SAMPLING_RESULTS_FOR_AFLATOXIN:
      'Canlyniadau samplu labordy ar gyfer afflatocsin (Rheoliad 2019/1793)',
    HEALTH_CERTIFICATE: 'Tystysgrif iechyd',
    JOURNEY_LOG: 'Log taith',
    OTHER: 'Arall'
  },
  change: 'Newid',
  editDetails: 'Golygu manylion',
  cancelAmend: {
    button: 'Canslo diwygio',
    successTitle: 'Llwyddiant',
    successBody:
      'Mae’r diwygiad wedi’i ganslo ac mae’r fersiwn a gyflwynwyd wedi’i hadfer.'
  },
  sections: {
    aboutTheConsignment: '1. Am y llwyth',
    descriptionOfTheGoods: '2. Disgrifiad o’r nwyddau',
    transportAndArrival: '3. Cludiant a chyrraedd',
    documents: '4. Dogfennau wedi’u huwchlwytho',
    consignmentParties: '5. Cyfeiriadau’r llwyth',
    contactAddress: '6. Cyfeiriad cyswllt'
  },
  cards: {
    importDetails: 'Tarddiad y mewnforyn',
    whatAreYouImporting: 'Beth ydych chi’n ei fewnforio?',
    reasonForImport: 'Prif reswm mewnforio',
    additionalAnimalDetails: 'Manylion ychwanegol',
    arrivalDetails: 'Manylion cyrraedd',
    transportDetails: 'Manylion cludo',
    rolesAndAddresses: 'Cyfeiriadau',
    contactAddress: 'Cyfeiriad cyswllt'
  },
  subsections: { transitCountries: 'Gwledydd tramwy' },
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
    exitBorderControlPost: 'Safle rheoli ffin ymadael',
    commodityCode: 'Cod nwyddau',
    commonName: 'Enw cyffredin',
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
  identifierTable: {
    animalColumn: 'Anifail',
    permanentAddress: 'Cyfeiriad parhaol',
    animalN: (n) => `Anifail ${n}`,
    animalNamed: (species, n) => `${species} ${n}`,
    heading: 'Manylion adnabod'
  },
  documentN: (n) => `Dogfen ${n}`,
  hidden: {
    cards: {
      importDetails: 'tarddiad y mewnforyn',
      whatAreYouImporting: 'beth ydych chi’n ei fewnforio',
      reasonForImport: 'prif reswm mewnforio',
      additionalAnimalDetails: 'manylion ychwanegol',
      arrivalDetails: 'manylion cyrraedd',
      transportDetails: 'manylion cludo',
      rolesAndAddresses: 'cyfeiriadau',
      contactAddress: 'cyfeiriad cyswllt'
    },
    rows: {
      transitedCountries: 'gwledydd y bydd y llwyth yn teithio drwyddynt'
    },
    numberOfAnimalsFor: (species) => `nifer yr anifeiliaid ar gyfer ${species}`,
    documentN: (n) => `dogfen ${n}`,
    identificationDetailsFor: (species) =>
      `manylion adnabod ar gyfer ${species}`
  },
  submit: {
    button: 'Parhau'
  },
  errors: {
    prefix: 'Gwall:',
    cards: {
      importDetails: 'Cwblhewch darddiad y mewnforyn',
      whatAreYouImporting: 'Cwblhewch beth ydych chi’n ei fewnforio',
      reasonForImport: 'Cwblhewch y prif reswm mewnforio',
      commodityDetails: 'Cwblhewch fanylion y nwyddau',
      additionalAnimalDetails: 'Cwblhewch y manylion ychwanegol',
      arrivalDetails: 'Cwblhewch y manylion cyrraedd',
      transportDetails: 'Cwblhewch y manylion cludo',
      rolesAndAddresses: 'Cwblhewch y rolau a’r cyfeiriadau',
      contactAddress: 'Cwblhewch y cyfeiriad cyswllt ar gyfer y llwyth hwn',
      documents: 'Cwblhewch y dogfennau'
    },
    species: {
      numberOfAnimals: (species) =>
        `Rhowch nifer yr anifeiliaid ar gyfer ${species}`,
      atLeastOneIdentifier: (species) =>
        `Rhowch o leiaf 1 dynodwr anifail ar gyfer ${species}`
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
