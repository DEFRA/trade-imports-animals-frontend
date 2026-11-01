import { copy as sharedCopy } from '../../../../../../../shared/copy.cy.js'

// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
const addAnother = 'Cadw ac ychwanegu un arall'

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
    label: 'Cyfeirnod y ddogfen'
  },
  documentType: {
    label: 'Math o ddogfen',
    selectText: 'Dewiswch un'
  },
  dateOfIssue: {
    label: 'Dyddiad cyhoeddi',
    hint: sharedCopy.dateExample
  },
  file: {
    label: 'Atodiad',
    mustBe: 'Rhaid i’ch ffeil fod:',
    smallerThan: (size) => `yn llai na ${size}`,
    or: 'neu',
    allowedTypes: (hint) => `yn ${hint}`,
    upToMaximum: (max) => `hyd at uchafswm o ${max} ffeil`,
    noZipFiles: 'Ni chaniateir ffeiliau ZIP am resymau diogelwch',
    chooseButton: 'Dewiswch ffeil',
    dropInstruction: 'neu ollwng ffeil',
    noFileChosen: 'Dim ffeil wedi’i dewis',
    enteredDropZone: 'Wedi mynd i mewn i’r parth gollwng',
    leftDropZone: 'Wedi gadael y parth gollwng'
  },
  addAnother,
  table: {
    caption: 'Dogfennau rydych chi wedi’u hychwanegu',
    reference: 'Cyfeirnod y ddogfen',
    type: 'Math o ddogfen',
    dateOfIssue: 'Dyddiad cyhoeddi',
    status: 'Statws',
    actionsHidden: 'Cam gweithredu'
  },
  types: {
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
  remove: 'Tynnu',
  removeHidden: (documentNumber) => `dogfen ${documentNumber}`,
  viewFile: 'Gweld y ffeil',
  viewFileHidden: (documentNumber) => `ar gyfer dogfen ${documentNumber}`,
  refreshStatus: 'Adnewyddu statws y sgan firws',
  stillChecking: 'Yn dal i wirio rhai dogfennau. Adnewyddwch eto mewn eiliad.',
  notProvided: 'Heb ei ddarparu',
  scanTags: {
    complete: 'Gwiriad wedi’i gwblhau',
    rejected: 'Gwrthodwyd',
    virusFound: 'Firws wedi’i ganfod',
    uploadFailed: 'Methodd yr uwchlwytho',
    downloadFailed: 'Methodd y llwytho i lawr',
    scanning: 'Yn sganio am firws',
    unknown: 'Anhysbys'
  },
  scanStatusHidden: (reference) => `Statws gwirio firws ar gyfer ${reference}`,
  announce: {
    safe: 'Sgan y ddogfen wedi’i gwblhau: mae’r ffeil yn ddiogel i’w defnyddio',
    rejected:
      'Methodd gwiriad y ddogfen: ni allwch ddefnyddio’r ffeil. Tynnwch hi a rhowch gynnig arall arni.',
    virusFound:
      'Methodd gwiriad y ddogfen: mae’r ffeil yn cynnwys firws. Tynnwch hi a rhowch gynnig arall arni.',
    uploadFailed:
      'Methodd gwiriad y ddogfen: nid oedd modd uwchlwytho’r ffeil. Tynnwch hi a rhowch gynnig arall arni.',
    downloadFailed:
      'Methodd gwiriad y ddogfen: nid oedd modd llwytho’r ffeil i lawr. Tynnwch hi a rhowch gynnig arall arni.'
  },
  errors: {
    hiddenPrefix: 'Gwall:',
    referenceMaxLength: (max) =>
      `Rhaid i gyfeirnod y ddogfen fod yn ${max} nod neu lai`,
    referenceCharacters:
      'Rhaid i gyfeirnod y ddogfen gynnwys llythrennau, rhifau, bylchau, cysylltnodau, atalnodau llawn a blaenslaesau yn unig',
    dateInvalid: 'Rhowch ddyddiad go iawn',
    referenceRequired: 'Rhowch gyfeirnod dogfen',
    typeRequired: 'Dewiswch fath o ddogfen',
    dateRequired: 'Rhowch ddyddiad cyhoeddi',
    fileRequired: 'Uwchlwythwch ddogfen',
    fileEmpty: 'Mae’r ffeil a ddewiswyd yn wag',
    fileVirus: 'Mae’r ffeil a ddewiswyd yn cynnwys firws',
    fileDownloadFailed: 'Nid oedd modd llwytho’r ffeil a ddewiswyd i lawr',
    documentNotSaved: (saveAction) =>
      `Mae’n ddrwg gennym, mae problem gyda’r gwasanaeth. Cafodd eich dogfen ei huwchlwytho ond nid yw wedi’i chadw i’r hysbysiad hwn. Dewiswch ‘${saveAction}’ i roi cynnig arall arni.`,
    documentsUnchecked: (saveAction) =>
      `Mae’n ddrwg gennym, mae problem gyda’r gwasanaeth. Nid oedd modd gwirio bod pob dogfen a uwchlwythwyd gennych wedi’i chadw i’r hysbysiad hwn. Dewiswch ‘${saveAction}’ i roi cynnig arall arni.`,
    uploadFailed:
      'Nid oedd modd uwchlwytho’r ffeil a ddewiswyd. Rhowch gynnig arall arni.',
    uploadUnavailable:
      'Ni ellir uwchlwytho dogfennau ar hyn o bryd. Ail-lwythwch y dudalen neu dewch yn ôl yn nes ymlaen.',
    maxDocuments: (max) => `Gallwch uwchlwytho uchafswm o ${max} ffeil`,
    fileFallbackName: 'Mae’r ffeil',
    rejected: (filename) =>
      `Ni allwch ddefnyddio ${filename}. Tynnwch hi a rhowch gynnig arall arni gyda ffeil wahanol.`,
    fileType: (allowedTypesHint) =>
      `Rhaid i’r ffeil a ddewiswyd fod yn ${allowedTypesHint}`,
    oversize: (maxSizeLabel) =>
      `Rhaid i’r ffeil a ddewiswyd fod yn llai na ${maxSizeLabel}`,
    someNoLongerValid:
      'Nid yw un neu fwy o’ch dogfennau a arbedwyd yn ddilys mwyach. Adolygwch y rhestr cyn parhau.',
    someStillScanning:
      'Mae un neu fwy o’ch dogfennau’n dal i gael eu sganio. Arhoswch am eiliad a rhowch gynnig arall arni.',
    someRejected:
      'Gwrthodwyd un neu fwy o’ch dogfennau. Dychwelwch i Ddogfennau i’w tynnu ac uwchlwytho eto.'
  }
}
