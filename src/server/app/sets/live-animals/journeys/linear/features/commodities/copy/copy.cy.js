// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.

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
      clearAll: 'Clirio’r cyfan'
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
      packagesWholeNumber: 'Rhaid i nifer y pecynnau fod yn rif cyfan, fel 5',
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
    permanentAddress: {
      warning: 'Mae darparu cyfeiriad ffug yn weithred o dwyll',
      definitionLeadIn: 'Cyfeiriad parhaol yw lle bydd anifail:',
      definitionItems: [
        'yn preswylio’n barhaol',
        'yn gallu cael ei wirio gan yr Asiantaeth Iechyd Anifeiliaid a Phlanhigion (APHA)'
      ],
      question: 'Ble bydd eu cyfeiriad parhaol?'
    },
    saveAndAddAnother: 'Cadw ac ychwanegu un arall',
    saveAndFinish: 'Cadw a gorffen',
    address: {
      nameOrOrganisationName: 'Enw neu enw’r sefydliad',
      addressLine1: 'Llinell gyfeiriad 1',
      addressLine2: 'Llinell gyfeiriad 2 (dewisol)',
      townOrCity: 'Tref neu ddinas',
      county: 'Sir (dewisol)',
      postcode: 'Cod post neu god zip',
      phone: 'Rhif ffôn',
      email: 'Cyfeiriad e-bost'
    },
    addressHints: {
      phone: 'Ar gyfer rhifau rhyngwladol, cynhwyswch god y wlad'
    },
    errors: {
      identifierMax: {
        animalIdentifierMicrochip:
          'Rhaid i’r microsglodyn fod yn 58 nod neu lai',
        animalIdentifierPassport: 'Rhaid i’r pasbort fod yn 58 nod neu lai',
        animalIdentifierTattoo: 'Rhaid i’r tatŵ fod yn 58 nod neu lai',
        animalIdentifierEarTag: 'Rhaid i’r tag clust fod yn 58 nod neu lai',
        horseName: 'Rhaid i enw’r ceffyl fod yn 58 nod neu lai'
      },
      addressMandatory: {
        nameOrOrganisationName: 'Rhowch enw neu enw sefydliad',
        addressLine1: 'Rhowch linell gyfeiriad 1',
        townOrCity: 'Rhowch dref neu ddinas',
        postcode: 'Rhowch god post neu god zip',
        phone: 'Rhowch rif ffôn',
        email: 'Rhowch gyfeiriad e-bost'
      },
      addressFormat: {
        nameOrOrganisationName:
          'Rhaid i’r enw neu enw’r sefydliad fod yn 255 nod neu lai',
        addressLine1: 'Rhaid i linell gyfeiriad 1 fod yn 255 nod neu lai',
        addressLine2: 'Rhaid i linell gyfeiriad 2 fod yn 255 nod neu lai',
        townOrCity: 'Rhaid i’r dref neu ddinas fod yn 100 nod neu lai',
        county: 'Rhaid i’r sir fod yn 100 nod neu lai',
        postcode: 'Rhaid i’r cod post neu’r cod zip fod yn 12 nod neu lai',
        phone: 'Rhaid i’r rhif ffôn fod yn 20 nod neu lai',
        email: 'Rhaid i’r cyfeiriad e-bost fod yn 254 nod neu lai'
      },
      atLeastOneIdentifier: 'Rhowch o leiaf un dynodwr ar gyfer yr anifail hwn',
      capReached: (cap) =>
        `Rydych eisoes wedi nodi manylion ar gyfer pob un o’r ${cap} anifail — tynnwch gofnod cyn ychwanegu un arall`
    }
  }
}
