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
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
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
    address: { addressLine1: '643 Main Street', country: 'United Kingdom' }
  },
  placeOfOrigin: {
    name: 'Origin Farm',
    address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
  },
  consignee: {
    name: 'British Livestock Ltd',
    address: {
      addressLine1: '10 Market Street',
      country: 'United Kingdom'
    }
  },
  importer: {
    name: 'Import Co UK',
    address: { addressLine1: '20 Trade Road', country: 'United Kingdom' }
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
    address: { addressLine1: 'Woodham Lane', country: 'United Kingdom' }
  },
  declaration: 'confirmed'
}

/**
 * Seed variants — overlays on `submitReadySeed` whose commodity/documents
 * choices open the gates the base seed leaves shut. The base seed's single
 * Cow line never scopes the Horse-gated `horseName`, the Cat/Dog-gated
 * `permanentAddress`, the `notInUnionOf` free-text identifiers (Cow sits in
 * the passport∪tattoo∪earTag union) or the four per-document leaves (no
 * `documents` records). Values are the services' real canned data
 * (`services/commodities`, `services/document-types`) — the same vocabulary
 * the pages store.
 *
 * Both provers run every variant × every scope state, so page reachability
 * is proven in the states these variants create, and `proveScopeCompleteness`
 * fails loudly when a manifest obligation is scoped by NO variant/state pair.
 *
 * @returns {Array<{ id: string, answers: object }>} named answer sets.
 */
export const seedVariants = () => [
  { id: 'base', answers: submitReadySeed },
  {
    // Horse: horseName (and passport) per unit record.
    id: 'horse-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commoditySelection: 'Horse',
          speciesSelection: '822332',
          numberOfPackages: '2',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierPassport: 'GB-2026-0001' }]
        }
      ]
    }
  },
  {
    // Cat: permanentAddress (mandatory when in scope) per unit record.
    id: 'cat-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commoditySelection: 'Cat',
          speciesSelection: '923501',
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierPassport: 'GB-2026-0002' }]
        }
      ]
    }
  },
  {
    // Fish is outside the specific-identifier union — the notInUnionOf
    // free-text identifiers (identificationDetails, description) apply.
    id: 'fish-line',
    answers: {
      ...submitReadySeed,
      commodityLines: [
        {
          commoditySelection: 'Fish',
          speciesSelection: '801204',
          numberOfAnimalsQuantity: '40',
          animalIdentifiers: [
            { animalIdentifierIdentificationDetails: 'Tank 12, batch 7' }
          ]
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
