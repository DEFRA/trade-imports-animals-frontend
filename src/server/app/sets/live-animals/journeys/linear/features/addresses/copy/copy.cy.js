// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
import { copy as sharedCopy } from '../../../../../../../shared/copy.cy.js'

export const copy = {
  hub: {
    title: 'Cyfeiriadau’r llwyth',
    intro: 'Ychwanegwch yr holl gyfeiriadau sy’n ymwneud â’r llwyth.',
    warning: 'Mae darparu cyfeiriad ffug yn weithred o dwyll',
    change: 'Newid',
    editDetails: 'Golygu manylion',
    cph: {
      title: 'Rhif daliad plwyf sirol (CPH)',
      hint: 'Mae’r rhif daliad plwyf sirol (CPH) yn adnabod y daliad lle bydd yr anifeiliaid yn cael eu cadw.',
      add: 'Ychwanegu rhif CPH'
    }
  },
  parties: {
    placeOfOrigin: {
      title: 'Man tarddiad',
      hint: 'Y cyfeiriad lle mae’r anifeiliaid yn dechrau eu taith i Brydain Fawr',
      add: 'Ychwanegu man tarddiad',
      error: 'Dewiswch fan tarddiad o’r rhestr'
    },
    consignor: {
      title: 'Anfonwr',
      hint: 'Dyma anfonwr y llwyth.',
      add: 'Ychwanegu anfonwr',
      error: 'Dewiswch anfonwr o’r rhestr'
    },
    consignee: {
      title: 'Derbynnydd',
      hint: 'Dyma dderbynnydd neu brynwr y llwyth sy’n cael ei gludo neu ei drosglwyddo.',
      add: 'Ychwanegu derbynnydd',
      error: 'Dewiswch dderbynnydd o’r rhestr'
    },
    importer: {
      title: 'Mewnforiwr',
      hint: 'Fel arfer, yr un un â’r derbynnydd. Gallwch ddewis person gwahanol os oes angen.',
      add: 'Ychwanegu mewnforiwr',
      error: 'Dewiswch fewnforiwr o’r rhestr'
    },
    placeOfDestination: {
      title: 'Man cyrchfan',
      hint: 'Dyma lle bydd yr anifeiliaid yn cael eu dadlwytho a’u lletya am o leiaf 48 awr. Os oes angen tystysgrif iechyd, bydd yn dangos y cyfeiriad hwn.',
      add: 'Ychwanegu man cyrchfan',
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
    resultsHeading: 'Dewiswch gyfeiriad',
    resultsCount: (shown, total) =>
      `Yn dangos ${shown} allan o ${total} canlyniad`,
    table: {
      selectHidden: 'Dewis',
      name: 'Enw',
      address: 'Cyfeiriad',
      country: 'Gwlad',
      actionsHidden: 'Camau gweithredu'
    },
    selectRowPrefix: 'Dewis',
    viewDetails: 'Gweld manylion',
    viewDetailsFor: 'ar gyfer',
    addNewAddress: sharedCopy.addressHandshake.addNewAddress,
    handshakeErrors: sharedCopy.addressHandshake.errors
  }
}
