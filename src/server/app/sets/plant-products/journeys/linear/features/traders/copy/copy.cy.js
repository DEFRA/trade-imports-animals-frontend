// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
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
