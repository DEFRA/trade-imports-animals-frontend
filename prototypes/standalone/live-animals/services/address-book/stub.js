// Vendored saved-party reference data (trader profile / gov.identity saved parties) — the swap point when the real saved-parties service lands (spec ruling c-018).

// Each entry carries the full V4 Standard Address Block so a selection can be
// saved by copy (spec ruling c-020) — the chosen party's name and address are
// copied into the answer, never shared by reference.
export const CONSIGNOR_OPTIONS = [
  {
    id: 'laiterie-du-nord',
    name: 'Laiterie du Nord SARL',
    address: {
      addressLine1: '12 Rue de la Gare',
      addressLine2: '',
      townOrCity: 'Lille',
      county: '',
      postalOrZipCode: '59000',
      country: 'France',
      telephoneNumber: '+33 3 20 61 10 10',
      emailAddress: 'exports@laiterie-du-nord.example.com'
    }
  },
  {
    id: 'eurostore-services',
    name: 'EuroStore Services',
    address: {
      addressLine1: 'Rue de la Loi 200',
      addressLine2: '',
      townOrCity: 'Brussels',
      county: '',
      postalOrZipCode: '1040',
      country: 'Belgium',
      telephoneNumber: '+32 2 555 12 34',
      emailAddress: 'dispatch@eurostore.example.be'
    }
  },
  {
    id: 'alpenhof-viehhandel',
    name: 'Alpenhof Viehhandel GmbH',
    address: {
      addressLine1: 'Bahnhofstrasse 5',
      addressLine2: 'Haus B',
      townOrCity: 'Bern',
      county: '',
      postalOrZipCode: '3011',
      country: 'Switzerland',
      telephoneNumber: '+41 31 555 00 11',
      emailAddress: 'office@alpenhof.example.ch'
    }
  }
]

export const CONSIGNEE_OPTIONS = [
  {
    id: 'yorkshire-dales-livestock',
    name: 'Yorkshire Dales Livestock Ltd',
    address: {
      addressLine1: 'Unit 4, Auction Mart Lane',
      addressLine2: '',
      townOrCity: 'Skipton',
      county: 'North Yorkshire',
      postalOrZipCode: 'BD23 1UD',
      country: 'United Kingdom',
      telephoneNumber: '+44 1756 555 0192',
      emailAddress: 'intake@yorkshire-dales-livestock.example.co.uk'
    }
  },
  {
    id: 'greenacre-farming',
    name: 'Greenacre Farming Co',
    address: {
      addressLine1: 'Greenacre Farm',
      addressLine2: 'Lower Henlade',
      townOrCity: 'Taunton',
      county: 'Somerset',
      postalOrZipCode: 'TA3 5NB',
      country: 'United Kingdom',
      telephoneNumber: '+44 1823 555 0170',
      emailAddress: 'office@greenacre-farming.example.co.uk'
    }
  },
  {
    id: 'border-mart-holdings',
    name: 'Border Mart Holdings',
    address: {
      addressLine1: 'Rosehill Estate',
      addressLine2: '',
      townOrCity: 'Carlisle',
      county: 'Cumbria',
      postalOrZipCode: 'CA1 2RW',
      country: 'United Kingdom',
      telephoneNumber: '+44 1228 555 0139',
      emailAddress: 'arrivals@border-mart.example.co.uk'
    }
  }
]

export const IMPORTER_OPTIONS = [
  {
    id: 'albion-livestock-imports',
    name: 'Albion Livestock Imports Ltd',
    address: {
      addressLine1: '18 Harbour Road',
      addressLine2: '',
      townOrCity: 'Dover',
      county: 'Kent',
      postalOrZipCode: 'CT17 9BU',
      country: 'United Kingdom',
      telephoneNumber: '+44 1304 555 0184',
      emailAddress: 'notifications@albion-livestock.example.co.uk'
    }
  },
  {
    id: 'severn-vale-imports',
    name: 'Severn Vale Imports',
    address: {
      addressLine1: 'The Old Granary',
      addressLine2: 'Quedgeley Trading Estate',
      townOrCity: 'Gloucester',
      county: 'Gloucestershire',
      postalOrZipCode: 'GL2 4PA',
      country: 'United Kingdom',
      telephoneNumber: '+44 1452 555 0127',
      emailAddress: 'imports@severn-vale.example.co.uk'
    }
  },
  {
    id: 'harwich-port-agencies',
    name: 'Harwich Port Agencies',
    address: {
      addressLine1: '2 Quayside House',
      addressLine2: '',
      townOrCity: 'Harwich',
      county: 'Essex',
      postalOrZipCode: 'CO12 3HH',
      country: 'United Kingdom',
      telephoneNumber: '+44 1255 555 0163',
      emailAddress: 'agency@harwich-port.example.co.uk'
    }
  }
]

export const PLACE_OF_ORIGIN_OPTIONS = [
  {
    id: 'ferme-des-trois-vallees',
    name: 'Ferme des Trois Vallées',
    address: {
      addressLine1: '3 Chemin des Prés',
      addressLine2: '',
      townOrCity: 'Annecy',
      county: '',
      postalOrZipCode: '74000',
      country: 'France',
      telephoneNumber: '+33 4 50 55 01 23',
      emailAddress: 'contact@trois-vallees.example.fr'
    }
  },
  {
    id: 'van-dijk-livestock',
    name: 'Van Dijk Livestock BV',
    address: {
      addressLine1: 'Polderweg 18',
      addressLine2: '',
      townOrCity: 'Utrecht',
      county: '',
      postalOrZipCode: '3541 AB',
      country: 'Netherlands',
      telephoneNumber: '+31 30 555 0187',
      emailAddress: 'export@vandijk-livestock.example.nl'
    }
  },
  {
    id: 'lindenhof-agrar',
    name: 'Lindenhof Agrar GmbH',
    address: {
      addressLine1: 'Dorfstrasse 44',
      addressLine2: 'Hof 2',
      townOrCity: 'Münster',
      county: '',
      postalOrZipCode: '48143',
      country: 'Germany',
      telephoneNumber: '+49 251 555 0144',
      emailAddress: 'versand@lindenhof-agrar.example.de'
    }
  }
]

export const DESTINATION_OPTIONS = [
  {
    id: 'tech-imports-ltd',
    name: 'Tech Imports Ltd',
    address: {
      addressLine1: '643 Main Street',
      addressLine2: '',
      townOrCity: 'Birmingham',
      county: 'West Midlands',
      postalOrZipCode: 'B1 3AZ',
      country: 'United Kingdom',
      telephoneNumber: '+44 121 555 0143',
      emailAddress: 'goods-in@tech-imports.example.co.uk'
    }
  },
  {
    id: 'united-commerce',
    name: 'United Commerce',
    address: {
      addressLine1: '446 Church Lane',
      addressLine2: '',
      townOrCity: 'Manchester',
      county: 'Greater Manchester',
      postalOrZipCode: 'M1 2JE',
      country: 'United Kingdom',
      telephoneNumber: '+44 161 555 0446',
      emailAddress: 'deliveries@united-commerce.example.co.uk'
    }
  },
  {
    id: 'global-trading-co',
    name: 'Global Trading Co',
    address: {
      addressLine1: '945 Main Street',
      addressLine2: 'Unit 4',
      townOrCity: 'London',
      county: '',
      postalOrZipCode: 'E1 5AB',
      country: 'United Kingdom',
      telephoneNumber: '+44 20 7946 0945',
      emailAddress: 'warehouse@global-trading.example.co.uk'
    }
  }
]

// Seeded from the skeleton's mock-contacts.json. V4's two contact-address
// variants share one anchor (c-001, unresolved): only the select-from-
// gov.identity side is stubbed; the user-created variant is NOT built until
// c-001 is ruled on.
export const CONTACT_OPTIONS = [
  {
    id: 'animal-and-plant-health-agency',
    name: 'Animal and Plant Health Agency',
    address: {
      addressLine1: 'Woodham Lane',
      addressLine2: 'New Haw',
      townOrCity: 'Addlestone',
      county: 'Surrey',
      postalOrZipCode: 'KT15 3NB',
      country: 'United Kingdom',
      telephoneNumber: '+44 3000 200 301',
      emailAddress: 'enquiries@apha.example.gov.uk'
    }
  },
  {
    id: 'eurostore-services',
    name: 'EuroStore Services',
    address: {
      addressLine1: 'Rue de la Loi 200',
      addressLine2: '',
      townOrCity: 'Brussels',
      county: '',
      postalOrZipCode: '1040',
      country: 'Belgium',
      telephoneNumber: '+32 2 555 12 34',
      emailAddress: 'dispatch@eurostore.example.be'
    }
  },
  {
    id: 'laiterie-du-nord',
    name: 'Laiterie du Nord SARL',
    address: {
      addressLine1: '12 Rue de la Gare',
      addressLine2: '',
      townOrCity: 'Lille',
      county: '',
      postalOrZipCode: '59000',
      country: 'France',
      telephoneNumber: '+33 3 20 61 10 10',
      emailAddress: 'exports@laiterie-du-nord.example.com'
    }
  }
]

// V4 leaves the source list TBC (unresolved inline comment on that clause);
// per spec ruling c-018 reference data wins. Each entry carries the full V4
// Standard Address Block plus the transporter's approval number.
export const COMMERCIAL_TRANSPORTER_OPTIONS = [
  {
    id: 'channel-livestock-logistics',
    name: 'Channel Livestock Logistics Ltd',
    approvalNumber: 'UK/DOVER/T2/00012345',
    address: {
      addressLine1: '18 Eastern Docks',
      addressLine2: '',
      townOrCity: 'Dover',
      county: 'Kent',
      postalOrZipCode: 'CT16 1JA',
      country: 'United Kingdom',
      telephoneNumber: '+44 1304 555 0171',
      emailAddress: 'bookings@channel-livestock.example.co.uk'
    }
  },
  {
    id: 'transeuropa-animaux',
    name: 'TransEuropa Animaux SARL',
    approvalNumber: 'FR/CALAI/T2/00067890',
    address: {
      addressLine1: '4 Quai de la Marine',
      addressLine2: '',
      townOrCity: 'Calais',
      county: '',
      postalOrZipCode: '62100',
      country: 'France',
      telephoneNumber: '+33 3 21 55 01 62',
      emailAddress: 'dispatch@transeuropa-animaux.example.fr'
    }
  },
  {
    id: 'lagan-valley-haulage',
    name: 'Lagan Valley Haulage Ltd',
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: {
      addressLine1: 'Unit 7, Harbour Estate',
      addressLine2: '',
      townOrCity: 'Belfast',
      county: 'County Antrim',
      postalOrZipCode: 'BT3 9DT',
      country: 'United Kingdom',
      telephoneNumber: '+44 28 9055 0148',
      emailAddress: 'office@lagan-valley-haulage.example.co.uk'
    }
  }
]
