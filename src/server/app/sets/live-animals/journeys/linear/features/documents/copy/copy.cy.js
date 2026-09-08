// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Uwchlwytho dogfennau',
  guidance: {
    intro:
      'Rhaid i chi atodi ITAHC os oes angen un ar y llwyth hwn. Os nad yw gennych nawr, gallwch ei ychwanegu yn nes ymlaen. Dylid uwchlwytho pob dogfen cyn i’r llwyth gyrraedd porthladd yn y DU. Rhaid i ddogfennau fod yn Saesneg a rhaid i chi uwchlwytho pob tudalen.',
    otherDocumentsLead:
      'Mae dogfennau eraill y gallai fod angen i chi eu hatodi yn cynnwys:',
    otherDocuments: [
      'trwyddedau neu awdurdodiadau mewnforio',
      'dogfennau masnachol neu anfonebau'
    ],
    additional: {
      summary:
        'Gwirio pa ddogfennau ychwanegol y mae’n rhaid i chi eu huwchlwytho',
      caption: 'Dogfennau ychwanegol yn ôl math o lwyth',
      consignment: 'Llwyth',
      documentsNeeded: 'Dogfennau sydd eu hangen',
      rows: [
        {
          consignment: 'Anifeiliaid nad oes angen tystysgrif iechyd arnynt',
          documents: 'Datganiad gan yr allforiwr eu bod yn ffit i deithio'
        },
        {
          consignment:
            'Da byw sy’n tramwyo drwy diriogaethau cyfyngedig tafod glas',
          documents: 'Datganiad tafod glas GBHC172'
        },
        {
          consignment: 'Cnofilod a fewnforir at ddibenion ymchwil',
          documents: 'Trwydded RM39 a thystysgrif iechyd atodol'
        }
      ],
      linkText:
        'Gwirio pa ddogfennau sydd eu hangen arnoch ar GOV.UK (yn agor mewn tab newydd)',
      linkHref:
        'https://www.gov.uk/guidance/import-of-products-animals-food-and-feed-system'
    }
  },
  fileUploadHeading: 'Uwchlwytho ffeil',
  reference: {
    label: 'Cyfeirnod y ddogfen',
    hint: 'Er enghraifft, GBHC1234567890.'
  },
  dateOfIssue: {
    label: 'Dyddiad cyhoeddi',
    hint: 'Er enghraifft, 12/12/2025'
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
  types: {
    ITAHC: 'ITAHC',
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
  remove: 'Tynnu',
  removeHidden: (documentNumber) => `dogfen ${documentNumber}`,
  viewFile: 'Gweld y ffeil',
  viewFileHidden: (documentNumber) => `ar gyfer dogfen ${documentNumber}`,
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
  announce: {
    safe: 'Sgan y ddogfen wedi’i gwblhau: mae’r ffeil yn ddiogel i’w defnyddio',
    virusFound:
      'Methodd sgan y ddogfen: canfuwyd firws. Tynnwch y ffeil a rhowch gynnig arall arni.'
  },
  errors: {
    hiddenPrefix: 'Gwall:',
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
