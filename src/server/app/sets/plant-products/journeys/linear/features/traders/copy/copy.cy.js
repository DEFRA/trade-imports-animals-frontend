// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  consignorCreate: {
    pageTitle: 'Ychwanegu traddodwr neu allforiwr',
    heading: 'Ychwanegu traddodwr neu allforiwr',
    legend: 'Traddodwr neu allforiwr',
    fields: {
      consignorName: { label: 'Enw’r traddodwr neu’r allforiwr' },
      consignorAddressLine1: { label: 'Llinell gyfeiriad 1' },
      consignorAddressLine2: { label: 'Llinell gyfeiriad 2 (dewisol)' },
      consignorAddressLine3: { label: 'Llinell gyfeiriad 3 (dewisol)' },
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
        addressLine1: 'Llinell gyfeiriad 1',
        addressLine2: 'Llinell gyfeiriad 2 (dewisol)',
        addressLine3: 'Llinell gyfeiriad 3 (dewisol)',
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
        addressLine1: 'Llinell gyfeiriad 1',
        addressLine2: 'Llinell gyfeiriad 2 (dewisol)',
        addressLine3: 'Llinell gyfeiriad 3 (dewisol)',
        city: 'Tref neu ddinas',
        postcode: 'Cod post neu god ZIP',
        country: 'Gwlad'
      }
    },
    consignor: {
      heading: 'Traddodwr neu allforiwr',
      notAdded: 'Heb ei ychwanegu eto',
      addLink: 'Ychwanegu traddodwr neu allforiwr'
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
