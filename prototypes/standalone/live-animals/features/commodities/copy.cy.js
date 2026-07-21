// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.

// Welsh pluralisation differs from English; this machine draft uses the
// simple numeric style ('N cofnod dynodwr') rather than risking wrong
// mutations. A translator should review every function leaf.
const plural = (count, noun) => `${count} ${noun}`

export const copy = {
  search: {
    title: 'Beth ydych chi’n ei fewnforio?',
    inset: 'Mae angen hysbysiad ar wahân ar gyfer pob tystysgrif iechyd.',
    search: {
      label: 'Chwiliwch am enw cyffredin, cod nwyddau neu enw gwyddonol',
      hint: 'Er enghraifft, Cow, 0102, neu Bos taurus',
      button: 'Chwilio'
    },
    noMatches: 'Nid oes unrhyw nwyddau’n cyfateb i’ch chwiliad.',
    selectedCount: (count) => `${count} wedi’u dewis`,
    remove: 'Tynnu',
    removeAria: (text) => `Tynnu ${text}`,
    help: {
      summary: 'Help gyda chodau nwyddau',
      text: 'Defnyddir codau nwyddau i ddosbarthu nwyddau ar gyfer mewnforio ac allforio.'
    },
    errors: {
      selectCommodity: 'Dewiswch nwydd'
    }
  },
  consignmentDetails: {
    title: 'Manylion y llwyth',
    emptyText: 'Nid ydych wedi ychwanegu unrhyw nwyddau eto.',
    addAnother: 'Ychwanegu nwydd arall',
    addFirst: 'Ychwanegu nwydd',
    table: {
      caption: 'Nwyddau a ddewiswyd',
      commodityCode: 'Cod nwyddau',
      commonName: 'Enw cyffredin',
      actionsHidden: 'Camau gweithredu',
      remove: 'Tynnu'
    },
    animals: {
      label: 'Nifer yr anifeiliaid',
      hint: 'Er enghraifft, 1, 25 neu 5000.'
    },
    packages: {
      label: 'Nifer y pecynnau (dewisol)',
      hint: 'Fel cratiau, bagiau neu flychau'
    },
    errors: {
      animalsWholeNumber:
        'Rhaid i nifer yr anifeiliaid fod yn rif cyfan, fel 25',
      packagesWholeNumber: 'Rhaid i nifer y pecynnau fod yn rif cyfan, fel 5',
      countDrop: (records, species, entered) =>
        `Mae gennych ${plural(records, 'cofnod dynodwr')} ar gyfer ${species} ond fe wnaethoch nodi ${plural(entered, 'anifail')}. Tynnwch gofnodion dynodwr neu cadwch y cyfrif uwch.`
    }
  },
  identification: {
    title: 'Manylion adnabod anifeiliaid',
    inset:
      'Rhaid i chi ychwanegu holl fanylion adnabod yr anifeiliaid cyn i’r llwyth gyrraedd y porthladd mynediad.',
    emptyText: 'Nid ydych wedi ychwanegu unrhyw nwyddau eto.',
    addCommodity: 'Ychwanegu nwydd',
    identifierLabels: {
      animalIdentifierPassport: 'Pasbort',
      animalIdentifierTattoo: 'Tatŵ',
      animalIdentifierEarTag: 'Tag clust',
      horseName: 'Enw’r ceffyl',
      animalIdentifierIdentificationDetails: 'Manylion adnabod',
      animalIdentifierDescription: 'Disgrifiad'
    },
    permanentAddressSummaryLabel: 'Cyfeiriad parhaol',
    noIdentifier: 'Dim dynodwr wedi’i ddarparu',
    typeFields: {
      animalIdentifierPassport: {
        label: 'Rhif pasbort',
        hint: 'Er enghraifft, UK123456789'
      },
      animalIdentifierTattoo: {
        label: 'Tatŵ',
        hint: 'Er enghraifft, AB1234'
      },
      animalIdentifierEarTag: {
        label: 'Rhif tag clust',
        hint: 'Er enghraifft, UK123456789012'
      },
      horseName: { label: 'Enw’r ceffyl' }
    },
    fallbackFields: {
      animalIdentifierIdentificationDetails: {
        label: 'Manylion adnabod',
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
    removeRow: 'Tynnu',
    removeRowAria: (number) => `anifail ${number}`,
    permanentAddress: {
      heading: 'Cyfeiriad parhaol',
      required: 'Mae angen cyfeiriad parhaol ar gyfer yr anifail hwn.'
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
      country: 'Gwlad',
      countryPlaceholder: 'Dewiswch wlad',
      telephoneNumber: 'Rhif ffôn',
      emailAddress: 'Cyfeiriad e-bost'
    },
    errors: {
      identifierMax: {
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
        country: 'Dewiswch wlad',
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
        country: 'Dewiswch wlad o’r rhestr',
        telephoneNumber: 'Rhaid i’r rhif ffôn fod yn 20 nod neu lai',
        emailAddress: 'Rhaid i’r cyfeiriad e-bost fod yn 254 nod neu lai'
      },
      atLeastOneIdentifier: 'Rhowch o leiaf un dynodwr ar gyfer yr anifail hwn',
      capReached: (cap) =>
        `Rydych eisoes wedi nodi manylion ar gyfer pob un o’r ${cap} anifail — tynnwch gofnod cyn ychwanegu un arall`
    }
  }
}
