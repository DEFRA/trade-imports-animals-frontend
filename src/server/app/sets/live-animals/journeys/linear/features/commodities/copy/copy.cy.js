// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.

import { withThousandsSeparators } from './thousands-separators.js'

const plural = (count, noun) => `${count} ${noun}`

const ACTIONS_HIDDEN = 'Camau gweithredu'

export const copy = {
  search: {
    title: 'Beth ydych chi’n ei fewnforio?',
    inset:
      'Rhaid i chi gyflwyno hysbysiad ar wahân ar gyfer pob ITAHC unigol. Rhaid i chi hefyd gyflwyno hysbysiad ar gyfer nwyddau nad oes angen ITAHC arnynt.',
    searchLabel: 'Chwilio am nwydd',
    searchHint:
      'Gallwch chwilio yn ôl enw cyffredin (er enghraifft, gwartheg), cod nwyddau (0102), neu enw Lladin (Bos taurus).',
    searchButton: 'Chwilio',
    noResults: 'Ni chanfuwyd unrhyw ganlyniadau',
    selected: {
      heading: (count) => `${count} wedi’u dewis`,
      clearAll: 'Clirio’r cyfan',
      remove: 'Tynnu'
    },
    help: {
      summary: 'Help gyda chodau nwyddau',
      reference:
        'Mae codau nwyddau yn rhifau cyfeirio a gydnabyddir yn rhyngwladol.',
      describes:
        'Mae cod nwyddau yn disgrifio cynnyrch penodol wrth fewnforio neu allforio nwyddau.',
      lookupPrefix: 'Gallwch chwilio am godau nwyddau gan ddefnyddio’r',
      lookupLink: 'teclyn Tariff Masnach',
      lookupNewTab: '(yn agor mewn tab newydd)',
      lookupHref: 'https://www.gov.uk/trade-tariff'
    },
    errors: {
      selectCommodity: 'Dewiswch nwydd'
    }
  },
  selectedCommodities: {
    caption: 'Nwyddau a ddewiswyd',
    commodityCode: 'Cod nwyddau',
    species: 'Rhywogaeth',
    numberOfAnimals: 'Nifer yr anifeiliaid',
    actionsHidden: ACTIONS_HIDDEN
  },
  consignmentDetails: {
    title: 'Manylion y nwyddau',
    addAnother: 'Ychwanegu nwydd arall',
    table: {
      remove: 'Tynnu'
    },
    animals: {
      label: 'Nifer yr anifeiliaid'
    },
    packages: {
      label: 'Nifer y pecynnau (pan fo angen)',
      hint: 'Fel cratiau, bagiau neu flychau'
    },
    errors: {
      animalsRequired: 'Rhowch nifer yr anifeiliaid',
      animalsWholeNumber: 'Rhowch rif cyfan sy’n fwy na 0',
      animalsAboveMax: (max) =>
        `Rhaid i nifer yr anifeiliaid fod yn ${withThousandsSeparators(max)} neu lai`,
      packagesWholeNumber: 'Rhaid i nifer y pecynnau fod yn rif cyfan, fel 5',
      packagesAboveMax: (max) =>
        `Rhaid i nifer y pecynnau fod yn ${withThousandsSeparators(max)} neu lai`,
      countDrop: (records, species, entered) =>
        `Mae gennych ${plural(records, 'cofnod dynodwr')} ar gyfer ${species} ond fe wnaethoch nodi ${plural(entered, 'anifail')}. Tynnwch gofnodion dynodwr neu cadwch y cyfrif uwch.`
    }
  },
  identification: {
    title: 'Manylion adnabod',
    inset:
      'Rhaid i chi ychwanegu holl fanylion adnabod yr anifeiliaid cyn i’r llwyth gyrraedd y porthladd mynediad.',
    addAnotherCommodity: 'Ychwanegu nwydd arall',
    changeAnimalCount: 'Newid nifer yr anifeiliaid',
    summary: {
      change: 'Newid'
    },
    identifierLabels: {
      animalIdentifierMicrochip: 'Microsglodyn',
      animalIdentifierPassport: 'Pasbort',
      animalIdentifierTattoo: 'Tatŵ',
      animalIdentifierEarTag: 'Tag clust',
      horseName: 'Enw’r ceffyl'
    },
    table: {
      animalColumn: 'Anifail',
      permanentAddressColumn: 'Cyfeiriad parhaol',
      actionsHidden: ACTIONS_HIDDEN
    },
    counter: (species, next, cap) =>
      `Rhowch fanylion ar gyfer ${species} ${next} o ${cap}`,
    overCount: (cap, species, entered, overBy) =>
      `Mae’r llinell nwyddau hon yn rhestru ${cap} anifail ${species} ond rydych wedi nodi manylion ar gyfer ${entered}. Tynnwch ${overBy} i barhau.`,
    animalRow: (number) => `Anifail ${number}`,
    animalRowNamed: (species, number) => `${species} ${number}`,
    removeRow: 'Tynnu',
    removeRowAria: (number) => `anifail ${number}`,
    saveAndAddAnother: 'Cadw ac ychwanegu un arall',
    saveAndFinish: 'Cadw a gorffen',
    errors: {
      identifierMax: {
        animalIdentifierMicrochip:
          'Rhaid i’r microsglodyn fod yn 58 nod neu lai',
        animalIdentifierPassport: 'Rhaid i’r pasbort fod yn 58 nod neu lai',
        animalIdentifierTattoo: 'Rhaid i’r tatŵ fod yn 58 nod neu lai',
        animalIdentifierEarTag: 'Rhaid i’r tag clust fod yn 58 nod neu lai',
        horseName: 'Rhaid i enw’r ceffyl fod yn 58 nod neu lai'
      },
      atLeastOneIdentifier: 'Rhowch o leiaf un dynodwr ar gyfer yr anifail hwn',
      capReached: (cap) =>
        `Rydych eisoes wedi nodi manylion ar gyfer pob un o’r ${cap} anifail — tynnwch gofnod cyn ychwanegu un arall`
    }
  }
}
