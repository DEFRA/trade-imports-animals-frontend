import {
  BOS_TAURUS_ROW,
  EQUUS_CABALUS_ROW,
  FELIS_CATUS_ROW,
  STRUTHIO_ROW,
  lineOf
} from '../../features/commodities/search/test-support.js'

const UNITED_KINGDOM = 'United Kingdom'

export const submitReadySeed = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no',
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding',
  animalsCertifiedFor: 'slaughter',
  containsUnweanedAnimals: 'no',
  countyParishHoldingCph: '12/345/6789',
  commodityLines: [
    lineOf(BOS_TAURUS_ROW, {
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
    })
  ],
  consignor: {
    name: 'Astra Rosales',
    address: {
      addressLine1: '43 East Hague Extension',
      country: 'Switzerland'
    }
  },
  placeOfDestination: {
    name: 'Tech Imports Ltd',
    address: { addressLine1: '643 Main Street', country: UNITED_KINGDOM }
  },
  placeOfOrigin: {
    name: 'Origin Farm',
    address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
  },
  consignee: {
    name: 'British Livestock Ltd',
    address: {
      addressLine1: '10 Market Street',
      country: UNITED_KINGDOM
    }
  },
  importer: {
    name: 'Import Co UK',
    address: { addressLine1: '20 Trade Road', country: UNITED_KINGDOM }
  },
  portOfEntry: 'GB ABD',
  arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
  meansOfTransport: 'AIRPLANE',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transporterType: 'Commercial',
  commercialTransporter: {
    name: 'García Livestock Transport SL',
    address: {
      addressLine1: '43 East Hague Extension',
      country: 'Switzerland'
    },
    approvalNumber: 'ES-T2-45001294'
  },
  contactAddress: {
    name: 'Animal and Plant Health Agency',
    address: { addressLine1: 'Woodham Lane', country: UNITED_KINGDOM }
  },
  declaration: 'confirmed'
}

export const seedVariants = () => [
  { id: 'base', answers: submitReadySeed },
  {
    id: 'horse-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        lineOf(EQUUS_CABALUS_ROW, {
          numberOfPackages: '2',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierPassport: 'GB-2026-0001' }]
        })
      ]
    }
  },
  {
    id: 'cat-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        lineOf(FELIS_CATUS_ROW, {
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierPassport: 'GB-2026-0002' }]
        })
      ]
    }
  },
  {
    id: 'unidentified-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        lineOf(STRUTHIO_ROW, {
          numberOfAnimalsQuantity: '40'
        })
      ]
    }
  },
  {
    id: 'with-documents',
    answers: {
      ...submitReadySeed,
      documents: [
        {
          accompanyingDocumentType: 'ITAHC',
          accompanyingDocumentAttachmentType: 'PDF',
          accompanyingDocumentReference: 'DOC-2026-001',
          accompanyingDocumentDateOfIssue: {
            day: '01',
            month: '06',
            year: '2026'
          }
        }
      ]
    }
  }
]
