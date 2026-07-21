// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Uwchlwytho dogfennau',
  reference: {
    label: 'Cyfeirnod y ddogfen',
    hint: 'Er enghraifft, GBHC1234567890.'
  },
  dateOfIssue: {
    label: 'Dyddiad cyhoeddi',
    hint: 'Er enghraifft, 12 12 2025'
  },
  file: {
    label: 'Uwchlwytho ffeil',
    mustBe: 'Rhaid i’ch ffeil fod:',
    smallerThan: 'yn llai na',
    a: 'yn'
  },
  addAnother: 'Cadw ac ychwanegu un arall',
  table: {
    caption: 'Dogfennau rydych chi wedi’u hychwanegu',
    reference: 'Cyfeirnod y ddogfen',
    type: 'Math o ddogfen',
    dateOfIssue: 'Dyddiad cyhoeddi',
    status: 'Statws',
    actionsHidden: 'Camau gweithredu'
  },
  remove: 'Tynnu',
  removeHidden: (documentNumber) => `dogfen ${documentNumber}`,
  refreshStatus: 'Adnewyddu statws y sgan firws',
  stillChecking: 'Yn dal i wirio rhai dogfennau. Adnewyddwch eto mewn eiliad.',
  empty: 'Nid ydych wedi ychwanegu unrhyw ddogfennau eto.',
  notProvided: 'Heb ei ddarparu',
  continueButton: 'Parhau',
  scanTags: {
    safe: 'Diogel',
    virusFound: 'Firws wedi’i ganfod',
    checking: 'Yn gwirio',
    unknown: 'Anhysbys'
  },
  errors: {
    referenceMaxLength: 'Rhaid i gyfeirnod y ddogfen fod yn 58 nod neu lai',
    dateInvalid: 'Rhowch ddyddiad cyhoeddi go iawn',
    referenceRequired: 'Rhowch gyfeirnod dogfen',
    dateRequired: 'Rhowch y dyddiad cyhoeddi',
    fileRequired: 'Dewiswch ffeil i’w huwchlwytho',
    cannotContinue:
      'Ni allwch barhau nes bod pob dogfen wedi’i sganio neu ei thynnu',
    uploadFailed: 'Nid oedd modd uwchlwytho’r ffeil. Rhowch gynnig arall arni.',
    maxDocuments: (max) => `Gallwch ychwanegu uchafswm o ${max} dogfen`,
    fileFallbackName: 'Mae’r ffeil',
    virusFound: (filename) =>
      `${filename} yn cynnwys firws. Tynnwch hi a rhowch gynnig arall arni gyda ffeil wahanol.`,
    fileType: (allowedTypesHint) =>
      `Rhaid i’r ffeil a ddewiswyd fod yn ${allowedTypesHint}`,
    oversize: (maxSizeLabel) =>
      `Rhaid i’r ffeil a ddewiswyd fod yn llai na ${maxSizeLabel}`
  }
}
