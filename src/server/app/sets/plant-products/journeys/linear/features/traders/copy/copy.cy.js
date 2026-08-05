// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
const ADD_CONSIGNOR_OR_EXPORTER = 'Ychwanegu traddodwr neu allforiwr'
const CONSIGNOR_OR_EXPORTER = 'Traddodwr neu allforiwr'
const ADDRESS_LINE_1_LABEL = 'Llinell gyfeiriad 1'
const ADDRESS_LINE_2_LABEL = 'Llinell gyfeiriad 2 (dewisol)'
const ADDRESS_LINE_3_LABEL = 'Llinell gyfeiriad 3 (dewisol)'

export const copy = {
  consignorCreate: {
    pageTitle: ADD_CONSIGNOR_OR_EXPORTER,
    heading: ADD_CONSIGNOR_OR_EXPORTER,
    legend: CONSIGNOR_OR_EXPORTER,
    fields: {
      consignorName: { label: 'Enw’r traddodwr neu’r allforiwr' },
      consignorAddressLine1: { label: ADDRESS_LINE_1_LABEL },
      consignorAddressLine2: { label: ADDRESS_LINE_2_LABEL },
      consignorAddressLine3: { label: ADDRESS_LINE_3_LABEL },
      consignorCity: { label: 'Dinas neu dref' },
      consignorPostcode: { label: 'Cod post neu god ZIP (dewisol)' },
      consignorTelephone: { label: 'Rhif ffôn' },
      consignorCountry: {
        label: 'Gwlad',
        placeholder: 'Dewiswch eich gwlad'
      },
      consignorEmail: { label: 'Cyfeiriad e-bost' }
    },
    errors: {
      consignorName: {
        required: 'Rhowch enw traddodwr neu allforiwr',
        max: 'Rhaid i enw’r traddodwr neu’r allforiwr fod yn 255 nod neu lai'
      },
      consignorAddressLine1: {
        required: 'Rhowch linell gyfeiriad 1',
        max: 'Rhaid i linell gyfeiriad 1 fod yn 255 nod neu lai'
      },
      consignorAddressLine2: {
        max: 'Rhaid i linell gyfeiriad 2 fod yn 255 nod neu lai'
      },
      consignorAddressLine3: {
        max: 'Rhaid i linell gyfeiriad 3 fod yn 255 nod neu lai'
      },
      consignorCity: {
        required: 'Rhowch ddinas neu dref',
        max: 'Rhaid i’r ddinas neu’r dref fod yn 58 nod neu lai'
      },
      consignorPostcode: {
        max: 'Rhaid i’r cod post neu’r cod ZIP fod yn 32 nod neu lai'
      },
      consignorTelephone: {
        required: 'Rhowch rif ffôn',
        max: 'Rhaid i’r rhif ffôn fod yn 30 nod neu lai'
      },
      consignorCountry: { required: 'Dewiswch wlad' },
      consignorEmail: {
        required: 'Rhowch gyfeiriad e-bost',
        format:
          'Rhowch gyfeiriad e-bost yn y fformat cywir, fel enw@enghraifft.com',
        max: 'Rhaid i’r cyfeiriad e-bost fod yn 255 nod neu lai'
      }
    },
    continueLabel: 'Cadw a pharhau'
  },
  consignorPicker: {
    pageTitle: CONSIGNOR_OR_EXPORTER,
    caption: 'Masnachwyr',
    description:
      'Dewiswch y traddodwr neu’r allforiwr ar gyfer yr hysbysiad hwn, neu ychwanegwch un newydd.',
    noSaved: 'Nid ydych wedi cadw unrhyw draddodwyr nac allforwyr eto.',
    noMatches:
      'Nid oes unrhyw draddodwyr nac allforwyr yn cyfateb i’ch chwiliad.',
    search: {
      label: 'Chwilio',
      hint: 'Enw, cyfeiriad neu wlad',
      button: 'Chwilio'
    },
    resultsCaption: (shown, total) =>
      `Yn dangos ${shown} o ${total} traddodwr neu allforiwr`,
    table: {
      selectHidden: 'Dewis',
      name: 'Enw',
      address: 'Cyfeiriad',
      country: 'Gwlad',
      actionsHidden: 'Camau gweithredu'
    },
    selectRowPrefix: 'Dewis',
    viewDetails: 'Gweld y manylion',
    viewDetailsFor: 'ar gyfer',
    selectedPrefix: 'Traddodwr neu allforiwr a ddewiswyd:',
    errorPrefix: 'Gwall:',
    saveAndContinue: 'Cadw a pharhau',
    addNew: ADD_CONSIGNOR_OR_EXPORTER,
    errors: { required: 'Dewiswch draddodwr neu allforiwr o’r rhestr' }
  },
  consignorConfirmation: {
    pageTitle: 'Mae’r traddodwr neu’r allforiwr wedi cael ei greu',
    panelTitle: 'Mae’r traddodwr neu’r allforiwr wedi cael ei greu',
    continueLabel: 'Ychwanegu at yr hysbysiad'
  },
  tradersAddresses: {
    caption: 'Masnachwyr',
    heading: 'Mewnforiwr, Pacwyr, Cyfeiriad danfon a Thraddodwr',
    importer: {
      heading: 'Mewnforiwr',
      rows: {
        name: 'Enw',
        address: 'Cyfeiriad',
        country: 'Gwlad'
      }
    },
    packer: {
      heading: 'Paciwr (dewisol)',
      fields: {
        name: 'Enw',
        addressLine1: ADDRESS_LINE_1_LABEL,
        addressLine2: ADDRESS_LINE_2_LABEL,
        addressLine3: ADDRESS_LINE_3_LABEL,
        city: 'Tref neu ddinas',
        postcode: 'Cod post neu god ZIP',
        country: 'Gwlad'
      }
    },
    delivery: {
      heading: 'Cyfeiriad danfon',
      legend: "A yw'r cyfeiriad danfon yr un fath â chyfeiriad y mewnforiwr?",
      options: {
        yes: 'Ydy',
        no: 'Nac ydy'
      },
      fields: {
        name: 'Enw’r cyfeiriad danfon',
        addressLine1: ADDRESS_LINE_1_LABEL,
        addressLine2: ADDRESS_LINE_2_LABEL,
        addressLine3: ADDRESS_LINE_3_LABEL,
        city: 'Tref neu ddinas',
        postcode: 'Cod post neu god ZIP',
        country: 'Gwlad'
      }
    },
    consignor: {
      heading: CONSIGNOR_OR_EXPORTER,
      notAdded: 'Heb ei ychwanegu eto',
      addLink: ADD_CONSIGNOR_OR_EXPORTER
    },
    countryPlaceholder: 'Dewiswch wlad',
    continue: 'Parhau',
    errors: {
      destinationSameAsConsignee:
        "Dewiswch ydy os yw'r cyfeiriad danfon yr un fath â chyfeiriad y mewnforiwr",
      destinationName: 'Rhowch enw’r cyfeiriad danfon',
      destinationAddressLine1: 'Rhowch linell gyfeiriad 1 y cyfeiriad danfon',
      destinationCity: 'Rhowch dref neu ddinas y cyfeiriad danfon',
      destinationPostcode: 'Rhowch y cod post neu’r cod ZIP',
      destinationCountry: 'Dewiswch wlad y cyfeiriad danfon'
    }
  }
}
