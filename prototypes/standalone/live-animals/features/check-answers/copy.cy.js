// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Gwiriwch eich atebion',
  notProvided: 'Heb ei ddarparu',
  yesNo: { yes: 'Iawn', no: 'Na' },
  means: {
    AIRPLANE: 'Awyren',
    RAILWAY: 'Rheilffordd',
    ROAD_VEHICLE: 'Cerbyd ffordd',
    VESSEL: 'Llong'
  },
  change: 'Newid',
  sections: {
    aboutTheConsignment: '1. Am y llwyth',
    movement: '2. Symudiad',
    addresses: '3. Cyfeiriadau',
    documents: '4. Dogfennau'
  },
  groups: {
    consignmentDetails: 'Manylion y llwyth',
    commodityDetails: 'Manylion y nwyddau',
    species: 'Rhywogaeth'
  },
  cards: {
    importDetails: 'Manylion mewnforio',
    additionalAnimalDetails: 'Manylion ychwanegol am yr anifeiliaid',
    arrivalDetails: 'Manylion cyrraedd',
    transportDetails: 'Manylion cludo',
    rolesAndAddresses: 'Rolau a chyfeiriadau',
    contactAddress: 'Cyfeiriad cyswllt ar gyfer y llwyth hwn',
    documents: 'Dogfennau wedi’u huwchlwytho'
  },
  rows: {
    countryOfOrigin: 'Gwlad tarddiad',
    regionCodeRequired: 'Angen cod rhanbarth tarddiad',
    regionCode: 'Cod rhanbarth tarddiad',
    internalReference: 'Cyfeirnod mewnol',
    certifiedFor: 'Wedi’i ardystio ar gyfer',
    unweaned: 'Yn cynnwys anifeiliaid heb eu diddyfnu',
    reasonForImport: 'Rheswm dros fewnforio',
    purpose: 'Diben yn y farchnad',
    commodityCode: 'Cod nwyddau',
    commonName: 'Enw cyffredin',
    species: 'Rhywogaeth',
    numberOfAnimals: 'Nifer yr anifeiliaid',
    numberOfPackages: 'Nifer y pecynnau',
    portOfEntry: 'Porthladd mynediad',
    arrivalDate: 'Dyddiad cyrraedd y porthladd mynediad',
    meansOfTransport: 'Cyfrwng cludo',
    transitedCountries: 'Gwledydd y bydd y llwyth yn teithio drwyddynt',
    transportIdentification: 'Adnabod y cludiant',
    transportDocumentReference: 'Cyfeirnod dogfen cludo',
    name: 'Enw',
    address: 'Cyfeiriad',
    country: 'Gwlad',
    approvalNumber: 'Rhif cymeradwyo',
    type: 'Math',
    placeOfOrigin: 'Man tarddiad',
    consignor: 'Anfonwr',
    consignee: 'Derbynnydd',
    importer: 'Mewnforiwr',
    placeOfDestination: 'Man cyrchfan',
    cph: 'Rhif Daliad Plwyf Sirol (CPH)',
    documentReference: 'Cyfeirnod y ddogfen',
    documentType: 'Math o ddogfen',
    dateOfIssue: 'Dyddiad cyhoeddi',
    attachmentType: 'Math o atodiad'
  },
  identifierTable: {
    animalColumn: 'Anifail',
    permanentAddress: 'Cyfeiriad parhaol',
    animalN: (n) => `Anifail ${n}`,
    heading: 'Manylion yr anifeiliaid'
  },
  documentN: (n) => `Dogfen ${n}`,
  hidden: {
    transporterName: 'enw’r cludwr',
    transporterAddress: 'cyfeiriad y cludwr',
    transporterCountry: 'gwlad y cludwr',
    transporterApprovalNumber: 'rhif cymeradwyo’r cludwr',
    transporterType: 'math y cludwr',
    contactAddress: 'cyfeiriad cyswllt',
    documents: 'dogfennau',
    commodity: (n) => `nwydd ${n}`,
    identifiersForCommodity: (n) => `dynodwyr anifeiliaid ar gyfer nwydd ${n}`
  },
  submit: {
    heading: 'Nawr cyflwynwch eich hysbysiad',
    body: 'Parhewch i’r datganiad i gyflwyno eich hysbysiad.',
    button: 'Parhau'
  }
}
