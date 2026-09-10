/** The transporters a trader can pick from — one list, both kinds.
 *
 * Not address-book data. A transporter carries an `approvalNumber` and the
 * address book has no field for one (EUDPA-294, D13 scopes that ticket to the
 * consignment party), so this list stays local until a ticket extends the
 * address-book contract to represent transporters.
 *
 * `type` is what a pick means: a Commercial record answers
 * `commercialTransporter`, a Private one answers `privateTransporter`, and the
 * transporter type is read off the record rather than asked before the list
 * (design release 1). The two shapes differ because the two answers differ —
 * a commercial record carries the register's address lines and its approval
 * number, a private one carries the address the private-transporter form
 * collects.
 *
 * A transporter a trader types in by hand does not join this list: it lives on
 * the notification it was entered into and nowhere else. */
export const COMMERCIAL = 'Commercial'
export const PRIVATE = 'Private'

export const TRANSPORTER_OPTIONS = [
  {
    id: 'garcia-livestock-transport',
    type: COMMERCIAL,
    name: 'García Livestock Transport SL',
    approvalNumber: 'ES-T2-45001294',
    address: {
      addressLine1: '43 East Hague Extension',
      addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
      addressLine3: 'Quasoccaecat ut ear, 30055',
      country: 'Switzerland'
    }
  },
  {
    id: 'j-and-g-campbell',
    type: COMMERCIAL,
    name: 'J & G Campbell LTD',
    approvalNumber: 'UK/BURY/T2/00104115',
    address: {
      addressLine1: 'Rue de la Loi 200',
      addressLine2: '1040 Brussels',
      country: 'Belgium'
    }
  },
  {
    id: 'aberdeen-livestock',
    type: PRIVATE,
    name: 'Aberdeen Livestock Ltd',
    address: {
      addressLine1: '12 Harbour Road',
      addressLine2: '',
      townOrCity: 'Aberdeen',
      county: 'Aberdeenshire',
      postalOrZipCode: 'AB11 5DQ',
      country: 'United Kingdom',
      telephoneNumber: '+44 1224 000 111',
      emailAddress: 'movements@aberdeen-livestock.example.com'
    }
  },
  {
    id: 'romanian-agri-exports',
    type: PRIVATE,
    name: 'Romanian Agri Exports SRL',
    address: {
      addressLine1: 'Strada Agricultorilor 8',
      addressLine2: '',
      townOrCity: 'Cluj-Napoca',
      county: '',
      postalOrZipCode: '400000',
      country: 'Romania',
      telephoneNumber: '+40 264 000 222',
      emailAddress: 'transport@romanian-agri.example.com'
    }
  },
  {
    id: 'slovak-farm-export',
    type: PRIVATE,
    name: 'Slovak Farm Export',
    address: {
      addressLine1: 'Hlavná 45',
      addressLine2: '',
      townOrCity: 'Košice',
      county: '',
      postalOrZipCode: '040 01',
      country: 'Slovakia',
      telephoneNumber: '+421 55 000 333',
      emailAddress: 'export@slovak-farm.example.com'
    }
  },
  {
    id: 'finnish-livestock-oy',
    type: PRIVATE,
    name: 'Finnish Livestock Oy',
    address: {
      addressLine1: 'Satamakatu 3',
      addressLine2: '',
      townOrCity: 'Turku',
      county: '',
      postalOrZipCode: '20100',
      country: 'Finland',
      telephoneNumber: '+358 2 000 444',
      emailAddress: 'kuljetus@finnish-livestock.example.com'
    }
  }
]
