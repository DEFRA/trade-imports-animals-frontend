// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  hub: {
    title: 'Cyfeiriadau’r llwyth',
    warning: 'Mae darparu cyfeiriad ffug yn weithred o dwyll.',
    notAddedYet: 'Heb ei ychwanegu eto',
    change: 'Newid',
    add: 'Ychwanegu',
    continueButton: 'Parhau',
    cph: {
      title: 'Rhif Daliad Plwyf Sirol (CPH)',
      hint: 'Mae’r rhif Daliad Plwyf Sirol (CPH) yn adnabod y daliad lle bydd yr anifeiliaid yn cael eu cadw.'
    }
  },
  parties: {
    placeOfOrigin: {
      title: 'Man tarddiad',
      hint: 'Y cyfeiriad lle mae’r anifeiliaid yn dechrau eu taith i Brydain Fawr',
      error: 'Dewiswch fan tarddiad o’r rhestr'
    },
    consignor: {
      title: 'Anfonwr neu allforiwr',
      hint: 'Dyma anfonwr y llwyth.',
      error: 'Dewiswch anfonwr o’r rhestr'
    },
    consignee: {
      title: 'Derbynnydd',
      hint: 'Dyma dderbynnydd neu brynwr y llwyth sy’n cael ei gludo neu ei drosglwyddo.',
      error: 'Dewiswch dderbynnydd o’r rhestr'
    },
    importer: {
      title: 'Mewnforiwr',
      hint: 'Fel arfer, yr un un â’r derbynnydd. Gallwch ddewis person gwahanol os oes angen.',
      error: 'Dewiswch fewnforiwr o’r rhestr'
    },
    placeOfDestination: {
      title: 'Man cyrchfan',
      hint: 'Dyma lle bydd yr anifeiliaid yn cael eu dadlwytho a’u lletya am o leiaf 48 awr. Os oes angen tystysgrif iechyd, bydd yn dangos y cyfeiriad hwn.',
      error: 'Dewiswch fan cyrchfan o’r rhestr'
    }
  },
  picker: {
    caption: 'Partïon y llwyth',
    search: {
      label: 'Chwilio',
      hint: 'Enw, cyfeiriad neu wlad',
      button: 'Chwilio'
    },
    selectedAddressPrefix: 'Cyfeiriad a ddewiswyd:',
    errorPrefix: 'Gwall:',
    noMatches: 'Nid oes unrhyw gyfeiriadau’n cyfateb i’ch chwiliad.',
    resultsCaption: (shown, total) => `Yn dangos ${shown} o ${total} cyfeiriad`,
    table: {
      selectHidden: 'Dewis',
      name: 'Enw',
      address: 'Cyfeiriad',
      country: 'Gwlad',
      actionsHidden: 'Camau gweithredu'
    },
    selectRowPrefix: 'Dewis',
    viewDetails: 'Gweld manylion',
    viewDetailsFor: 'ar gyfer'
  }
}
