// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.

// Welsh pluralisation differs from English; this machine draft uses the
// simple numeric style ('N cofnod dynodwr') rather than risking wrong
// mutations. A translator should review every function leaf.
const plural = (count, noun) => `${count} ${noun}`

// The visually-hidden head of every table's action column.
const ACTIONS_HIDDEN = 'Camau gweithredu'

// The fallback identifier type an animal falls back to when it has no
// passport, tattoo or ear tag — named once for its list label and its field
// label. Not the identification page's own name, which is its own string.
const FALLBACK_IDENTIFIER_LABEL = 'Manylion adnabod'

export const copy = {
  search: {
    title: 'Beth ydych chi’n ei fewnforio?',
    inset:
      'Mae angen hysbysiad ar wahân ar gyfer pob tystysgrif iechyd. Rhaid hysbysu llwythi nad oes angen tystysgrif iechyd arnynt o hyd.',
    searchLabel: 'Chwilio am nwydd',
    searchHint:
      'Gallwch chwilio yn ôl enw’r nwydd (er enghraifft, Cow), cod nwyddau (0102), neu enw’r rhywogaeth (Bos taurus). Rhowch o leiaf 3 nod.',
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
      lookupLink: 'teclyn Tariff Masnach (yn agor mewn tab newydd)',
      lookupHref: 'https://www.gov.uk/trade-tariff'
    },
    errors: {
      selectCommodity: 'Dewiswch nwydd'
    }
  },
  consignmentDetails: {
    title: 'Manylion y nwyddau',
    addAnother: 'Ychwanegu nwydd arall',
    table: {
      caption: 'Nwyddau a ddewiswyd',
      commodityCode: 'Cod nwyddau',
      commonName: 'Enw cyffredin',
      actionsHidden: ACTIONS_HIDDEN,
      remove: 'Tynnu'
    },
    animals: {
      label: 'Nifer yr anifeiliaid',
      hint: 'Er enghraifft, 1, 25 neu 5000.'
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
    emptyText: 'Nid ydych wedi ychwanegu unrhyw nwyddau eto.',
    addCommodity: 'Ychwanegu nwydd',
    addAnotherCommodity: 'Ychwanegu nwydd arall',
    changeAnimalCount: 'Newid nifer yr anifeiliaid',
    summary: {
      caption: 'Nwyddau a ddewiswyd',
      commodityCode: 'Cod nwyddau',
      commonName: 'Enw cyffredin',
      numberOfAnimals: 'Nifer yr anifeiliaid',
      actionsHidden: ACTIONS_HIDDEN,
      change: 'Newid'
    },
    identifierLabels: {
      animalIdentifierMicrochip: 'Microsglodyn',
      animalIdentifierPassport: 'Pasbort',
      animalIdentifierTattoo: 'Tatŵ',
      animalIdentifierEarTag: 'Tag clust',
      horseName: 'Enw’r ceffyl',
      animalIdentifierIdentificationDetails: FALLBACK_IDENTIFIER_LABEL,
      animalIdentifierDescription: 'Disgrifiad'
    },
    table: {
      animalColumn: 'Anifail',
      permanentAddressColumn: 'Cyfeiriad parhaol',
      actionsHidden: ACTIONS_HIDDEN
    },
    typeFields: {
      animalIdentifierMicrochip: {
        label: 'Rhif microsglodyn',
        hint: 'Er enghraifft, 900123456789012'
      },
      animalIdentifierPassport: {
        label: 'Pasbort',
        hint: 'Er enghraifft, UK123456789'
      },
      animalIdentifierTattoo: {
        label: 'Tatŵ',
        hint: 'Er enghraifft, AB1234'
      },
      animalIdentifierEarTag: {
        label: 'Tag clust',
        hint: 'Er enghraifft, UK123456789012'
      },
      horseName: { label: 'Enw’r ceffyl' }
    },
    fallbackFields: {
      animalIdentifierIdentificationDetails: {
        label: FALLBACK_IDENTIFIER_LABEL,
        hint: 'Unrhyw ffordd arall y caiff yr anifail hwn ei adnabod, os nad oes ganddo basbort, tatŵ na thag clust'
      },
      animalIdentifierDescription: { label: 'Disgrifiad o’r anifail' }
    },
    counterNoCap: (species) => `Rhowch fanylion ar gyfer ${species}`,
    counter: (species, next, cap) =>
      `Rhowch fanylion ar gyfer ${species} ${next} o ${cap}`,
    overCount: (cap, species, entered, overBy) =>
      `Mae’r llinell nwyddau hon yn rhestru ${cap} anifail ${species} ond rydych wedi nodi manylion ar gyfer ${entered}. Tynnwch ${overBy} i barhau.`,
    allEntered: (cap, species) =>
      `Rydych wedi nodi manylion ar gyfer pob un o’r ${cap} anifail ${species}. Tynnwch gofnod os oes angen i chi ei ddisodli.`,
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
      postalOrZipCode: 'Cod post neu god zip',
      telephoneNumber: 'Rhif ffôn',
      emailAddress: 'Cyfeiriad e-bost'
    },
    errors: {
      identifierMax: {
        animalIdentifierMicrochip:
          'Rhaid i’r microsglodyn fod yn 58 nod neu lai',
        animalIdentifierPassport: 'Rhaid i’r pasbort fod yn 58 nod neu lai',
        animalIdentifierTattoo: 'Rhaid i’r tatŵ fod yn 58 nod neu lai',
        animalIdentifierEarTag: 'Rhaid i’r tag clust fod yn 58 nod neu lai',
        horseName: 'Rhaid i enw’r ceffyl fod yn 58 nod neu lai',
        animalIdentifierIdentificationDetails:
          'Rhaid i’r manylion adnabod fod yn 58 nod neu lai',
        animalIdentifierDescription:
          'Rhaid i’r disgrifiad fod yn 58 nod neu lai'
      },
      addressMandatory: {
        nameOrOrganisationName: 'Rhowch enw neu enw sefydliad',
        addressLine1: 'Rhowch linell gyfeiriad 1',
        townOrCity: 'Rhowch dref neu ddinas',
        postalOrZipCode: 'Rhowch god post neu god zip',
        telephoneNumber: 'Rhowch rif ffôn',
        emailAddress: 'Rhowch gyfeiriad e-bost'
      },
      addressFormat: {
        nameOrOrganisationName:
          'Rhaid i’r enw neu enw’r sefydliad fod yn 255 nod neu lai',
        addressLine1: 'Rhaid i linell gyfeiriad 1 fod yn 255 nod neu lai',
        addressLine2: 'Rhaid i linell gyfeiriad 2 fod yn 255 nod neu lai',
        townOrCity: 'Rhaid i’r dref neu ddinas fod yn 100 nod neu lai',
        county: 'Rhaid i’r sir fod yn 100 nod neu lai',
        postalOrZipCode:
          'Rhaid i’r cod post neu’r cod zip fod yn 12 nod neu lai',
        telephoneNumber: 'Rhaid i’r rhif ffôn fod yn 20 nod neu lai',
        emailAddress: 'Rhaid i’r cyfeiriad e-bost fod yn 254 nod neu lai'
      },
      atLeastOneIdentifier: 'Rhowch o leiaf un dynodwr ar gyfer yr anifail hwn',
      capReached: (cap) =>
        `Rydych eisoes wedi nodi manylion ar gyfer pob un o’r ${cap} anifail — tynnwch gofnod cyn ychwanegu un arall`
    }
  }
}
