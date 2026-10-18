/** The transporters the service ships, commercial and private in one list.
 *
 * `type` is what a pick means: a Commercial record answers
 * `commercialTransporter`, a Private one answers `privateTransporter`. A
 * commercial record carries register address lines and an approval number; a
 * private one carries the address the private-transporter form collects.
 *
 * `status` is whether the transporter has been approved yet. */
export const COMMERCIAL = 'Commercial'
export const PRIVATE = 'Private'

export const APPROVED = 'Approved'
export const NEW = 'New'

/** One private record. Every private transporter carries the same address
 * shape — the fields the private-transporter form collects — so the shape is
 * written once here and each record lists only what differs. */
const privateRecord = ({
  id,
  name,
  status,
  addressLine1,
  townOrCity,
  county = '',
  postcode,
  country,
  countryCode,
  phone,
  email
}) => ({
  id,
  type: PRIVATE,
  status,
  name,
  address: {
    addressLine1,
    addressLine2: '',
    townOrCity,
    county,
    postcode,
    country,
    countryCode,
    phone,
    email
  }
})

export const TRANSPORTER_OPTIONS = [
  {
    id: 'garcia-livestock-transport',
    type: COMMERCIAL,
    status: APPROVED,
    name: 'García Livestock Transport SL',
    approvalNumber: 'ES-T2-45001294',
    address: {
      addressLine1: '43 East Hague Extension',
      addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
      addressLine3: 'Quasoccaecat ut ear, 30055',
      country: 'Switzerland',
      countryCode: 'CH'
    }
  },
  {
    id: 'j-and-g-campbell',
    type: COMMERCIAL,
    status: APPROVED,
    name: 'J & G Campbell LTD',
    approvalNumber: 'UK/BURY/T2/00104115',
    address: {
      addressLine1: 'Rue de la Loi 200',
      addressLine2: '1040 Brussels',
      country: 'Belgium',
      countryCode: 'BE'
    }
  },
  privateRecord({
    id: 'aberdeen-livestock',
    name: 'Aberdeen Livestock Ltd',
    status: APPROVED,
    addressLine1: '12 Harbour Road',
    townOrCity: 'Aberdeen',
    county: 'Aberdeenshire',
    postcode: 'AB11 5DQ',
    country: 'United Kingdom',
    countryCode: 'GB',
    phone: '+44 1224 000 111',
    email: 'movements@aberdeen-livestock.example.com'
  }),
  privateRecord({
    id: 'romanian-agri-exports',
    name: 'Romanian Agri Exports SRL',
    status: NEW,
    addressLine1: 'Strada Agricultorilor 8',
    townOrCity: 'Cluj-Napoca',
    postcode: '400000',
    country: 'Romania',
    countryCode: 'RO',
    phone: '+40 264 000 222',
    email: 'transport@romanian-agri.example.com'
  }),
  privateRecord({
    id: 'slovak-farm-export',
    name: 'Slovak Farm Export',
    status: APPROVED,
    addressLine1: 'Hlavná 45',
    townOrCity: 'Košice',
    postcode: '040 01',
    country: 'Slovakia',
    countryCode: 'SK',
    phone: '+421 55 000 333',
    email: 'export@slovak-farm.example.com'
  }),
  privateRecord({
    id: 'finnish-livestock-oy',
    name: 'Finnish Livestock Oy',
    status: NEW,
    addressLine1: 'Satamakatu 3',
    townOrCity: 'Turku',
    postcode: '20100',
    country: 'Finland',
    countryCode: 'FI',
    phone: '+358 2 000 444',
    email: 'kuljetus@finnish-livestock.example.com'
  })
]
