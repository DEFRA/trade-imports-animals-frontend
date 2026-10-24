const UNITED_KINGDOM = 'United Kingdom'

/**
 * A maximal happy-path answer set that puts (almost) every obligation in
 * scope, overlaid per state with the scope-flag cross-product above.
 * Answer-shaped, which is exactly what `makeScope` consumes.
 */
export const submitReadySeed = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no',
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding',
  animalsCertifiedFor: 'slaughter',
  containsUnweanedAnimals: 'no',
  countyParishHoldingCph: '12/345/6789',
  commodityLines: [
    {
      commodityCode: '0102',
      speciesLatinName: 'Bos taurus',
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
    }
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

/**
 * The base seed and the overlays on it that open the gates it leaves shut.
 *
 * @returns {Array<{ id: string, answers: object }>} named answer sets.
 */
export const seedVariants = () => [
  { id: 'base', answers: submitReadySeed },
  {
    // 0101 Equus cabalus: horseName (and passport) per unit record.
    id: 'horse-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commodityCode: '0101',
          speciesLatinName: 'Equus cabalus',
          numberOfPackages: '2',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierPassport: 'GB-2026-0001' }]
        }
      ]
    }
  },
  {
    // 01061900 Felis catus: permanentAddress (mandatory when in scope) per unit record.
    id: 'cat-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commodityCode: '01061900',
          speciesLatinName: 'Felis catus',
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierPassport: 'GB-2026-0002' }]
        }
      ]
    }
  },
  {
    // 01063300 Struthio: the code carries no identifier list, so no identifier
    // obligation applies to its line and it carries no animal records.
    id: 'unidentified-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commodityCode: '01063300',
          speciesLatinName: 'Struthio',
          numberOfAnimalsQuantity: '40'
        }
      ]
    }
  },
  {
    // A document record scopes the four per-document mandatory fields.
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
