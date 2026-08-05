// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  pageTitle: 'Dogfennau cysylltiedig',
  caption: 'Dogfennau',
  heading: 'Dogfennau cysylltiedig',
  insetWarning:
    'Rhaid atodi tystysgrif ffytoiechydol i’r hysbysiad neu bydd eich llwyth yn cael ei wrthod',
  labels: {
    documentType: 'Math o ddogfen',
    documentReference: 'Cyfeirnod y ddogfen',
    issueDate: 'Dyddiad cyhoeddi',
    file: 'Uwchlwytho ffeil (dewisol)'
  },
  hints: {
    issueDate: 'Er enghraifft, 27/3/2026',
    file: (allowedTypesHint, maxSizeLabel) =>
      `Nid oes rhaid i chi uwchlwytho ffeil. Os byddwch yn gwneud hynny, rhaid iddi fod yn ${allowedTypesHint} ac yn llai na ${maxSizeLabel}.`
  },
  placeholderOption: 'Dewiswch fath o ddogfen',
  notProvided: 'Heb ei ddarparu',
  table: {
    caption: 'Dogfennau rydych wedi’u hychwanegu',
    headings: {
      documentType: 'Math o ddogfen',
      documentReference: 'Cyfeirnod y ddogfen',
      issueDate: 'Dyddiad cyhoeddi',
      status: 'Statws y ffeil',
      actions: 'Camau gweithredu'
    }
  },
  status: {
    checking: 'Yn gwirio',
    safe: 'Diogel',
    virus: 'Yn cynnwys firws',
    unavailable: 'Statws ddim ar gael',
    noFile: 'Dim ffeil'
  },
  announcements: {
    safe: 'Mae gwiriad y ffeil wedi’i gwblhau. Mae’r ffeil yn ddiogel.',
    virus: 'Mae gwiriad y ffeil wedi’i gwblhau. Mae’r ffeil yn cynnwys firws.',
    unavailable: 'Nid yw statws gwiriad y ffeil ar gael.'
  },
  actions: {
    addDocument: 'Ychwanegu dogfen',
    remove: 'Tynnu',
    viewFile: 'Gweld y ffeil',
    refresh: 'Adnewyddu statws sgan firws'
  },
  refreshTimeout:
    'Mae rhai ffeiliau’n dal i gael eu gwirio. Adnewyddwch eto mewn eiliad.',
  errors: {
    hiddenPrefix: 'Gwall:',
    documentTypeRequired: 'Dewiswch fath o ddogfen',
    referenceRequired: 'Rhowch gyfeirnod',
    referenceMaxLength: 'Rhaid i gyfeirnod y ddogfen fod yn 100 nod neu lai',
    dateRequired: 'Rhowch ddyddiad cyhoeddi',
    dateInvalid: 'Rhaid i’r dyddiad cyhoeddi fod yn ddyddiad go iawn',
    fileFallbackName: '’r ffeil',
    fileType: (allowedTypesHint) =>
      `Rhaid i’r ffeil a ddewiswyd fod yn ${allowedTypesHint}`,
    fileEmpty: 'Mae’r ffeil a ddewiswyd yn wag',
    oversize: (maxSizeLabel) =>
      `Rhaid i’r ffeil a ddewiswyd fod yn llai na ${maxSizeLabel}`,
    uploadFailed: 'Nid oedd modd uwchlwytho’r ffeil. Rhowch gynnig arall arni.',
    virus: (filename) =>
      `Mae ${filename} yn cynnwys firws. Tynnwch hi a rhoi cynnig arall arni gyda ffeil wahanol.`,
    removeFailed: 'Nid oedd modd tynnu’r ddogfen. Rhowch gynnig arall arni.',
    cannotContinue:
      'Ni allwch barhau nes bod pob ffeil wedi’i gwirio neu ei thynnu',
    maxDocuments: (max) => `Gallwch ychwanegu uchafswm o ${max} dogfen`
  }
}
