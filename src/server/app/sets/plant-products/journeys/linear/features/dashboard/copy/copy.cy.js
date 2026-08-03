// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Eich hysbysiadau mewnforio',
  heading: 'Eich hysbysiadau mewnforio',
  createButton: 'Creu hysbysiad newydd',
  statuses: {
    draft: 'Drafft',
    submitted: 'Cyflwynwyd',
    amend: 'Diwygiad ar y gweill'
  },
  table: {
    headings: {
      reference: 'Cyfeirnod',
      status: 'Statws',
      origin: 'Tarddiad',
      arrival: 'Cyrraedd',
      created: 'Crëwyd',
      submitted: 'Cyflwynwyd',
      actions: 'Camau gweithredu'
    }
  },
  actions: {
    continue: 'Parhau',
    forNotification: (reference) => `hysbysiad ${reference}`
  },
  filters: {
    heading: 'Hidlo hysbysiadau',
    keywords: {
      label: 'Allweddeiriau neu gyfeirnod',
      hint: 'Nodwch gyfeirnod hysbysiad'
    },
    status: {
      label: 'Statws',
      all: 'Pob un'
    },
    country: {
      label: 'Gwlad tarddiad',
      all: 'Pob un',
      groups: {
        uk: 'Y Deyrnas Unedig',
        countries: 'Gwledydd'
      }
    },
    startDate: {
      label: 'Dyddiad dechrau’r ystod'
    },
    endDate: {
      label: 'Dyddiad diwedd yr ystod'
    },
    date: {
      hint: 'Er enghraifft, 7 3 2026',
      day: 'Diwrnod',
      month: 'Mis',
      year: 'Blwyddyn'
    },
    search: 'Chwilio',
    clear: 'Clirio'
  },
  sort: {
    label: 'Trefnu yn ôl',
    apply: 'Gosod',
    options: {
      arrivalNewest: 'Cyrraedd (mwyaf newydd i’r hynaf)',
      arrivalOldest: 'Cyrraedd (hynaf i’r mwyaf newydd)',
      createdNewest: 'Dyddiad creu (mwyaf newydd i’r hynaf)',
      createdOldest: 'Dyddiad creu (hynaf i’r mwyaf newydd)'
    }
  },
  pagination: {
    results: {
      none: '0 canlyniad',
      single: '1 canlyniad',
      range: (start, end, total) =>
        `Yn dangos ${start} i ${end} o ${total} o ganlyniadau`
    },
    next: 'Nesaf',
    previous: 'Blaenorol'
  },
  search: {
    noResults: 'Ni chanfuwyd unrhyw hysbysiadau'
  },
  errors: {
    keywordsMax: 'Rhaid i’r term chwilio fod yn 255 nod neu lai',
    startDateReal: 'Rhaid i’r dyddiad dechrau fod yn ddyddiad go iawn',
    endDateReal: 'Rhaid i’r dyddiad diwedd fod yn ddyddiad go iawn',
    startBeforeEnd:
      'Rhaid i’r dyddiad dechrau fod yr un fath â’r dyddiad diwedd neu cyn hynny'
  }
}
