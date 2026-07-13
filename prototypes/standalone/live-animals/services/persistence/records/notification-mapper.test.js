import { describe, expect, it } from 'vitest'
import {
  answersToNotification,
  notificationToAnswers,
  answersToTargetNotification,
  targetNotificationToAnswers
} from './notification-mapper.js'

const address = (name, line1) => ({
  name,
  address: { addressLine1: line1, postcode: 'AB1 2CD' }
})

// Answers carrying only the 26 obligations Mapper A maps to the current
// backend notification. Single commodity line, one species, one animal
// identifier unit with earTag + passport only — the identifiers that DO have
// a home on the backend species entry.
const mappedAnswers = () => ({
  referenceNumber: 'GBN-AG-26-ABC123',
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'Yes',
  internalReferenceNumber: 'Imports456GB',
  animalsCertifiedFor: 'Further keeping',
  containsUnweanedAnimals: 'No',
  reasonForImport: 'Internal market',
  placeOfOrigin: address('Origin Farm', '1 Farm Lane'),
  consignor: address('Consignor Ltd', '2 Depot Road'),
  consignee: address('Consignee Ltd', '3 Dock Street'),
  importer: address('Importer Ltd', '4 Port Way'),
  placeOfDestination: address('Destination Farm', '5 Field Lane'),
  contactAddress: address('Contact Person', '6 High Street'),
  commercialTransporter: {
    name: 'Transporter Co',
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: { addressLine1: '7 Route One' }
  },
  countyParishHoldingCph: '12/345/6789',
  portOfEntry: 'ABERDEEN',
  arrivalDateAtPort: { day: 12, month: 12, year: 2026 },
  commodityLines: [
    {
      commoditySelection: 'Cow',
      typeSelection: 'Domestic',
      speciesSelection: ['1148346'],
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [
        {
          animalIdentifierEarTag: 'UK123456789012',
          animalIdentifierPassport: 'UK123456789'
        }
      ]
    }
  ]
})

// mappedAnswers plus every obligation Mapper A has no home for: the Tier-A
// pair, the Tier-B gaps, the Tier-C documents collection, and a richer
// animal-identifier unit carrying the five dropped unit identifiers.
const answersWithGaps = () => ({
  ...mappedAnswers(),
  responsiblePersonForLoad: { responsiblePerson: 'Auth User' },
  regionOfOriginCode: 'FR-75',
  purposeInInternalMarket: 'Breeding',
  transporterType: 'Commercial',
  privateTransporter: address('Jane Private', '9 Private Road'),
  meansOfTransport: 'Road Vehicle',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transitedCountries: ['France', 'Belgium'],
  declaration: ['confirmed'],
  documents: [
    {
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: '2025-12-12'
    }
  ],
  commodityLines: [
    {
      commoditySelection: 'Cow',
      typeSelection: 'Domestic',
      speciesSelection: ['1148346'],
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [
        {
          animalIdentifierEarTag: 'UK123456789012',
          animalIdentifierPassport: 'UK123456789',
          animalIdentifierTattoo: 'AB1234',
          horseName: 'Dobbin',
          animalIdentifierIdentificationDetails: 'Hive mark HM-2026-004',
          animalIdentifierDescription: 'Brown cow',
          permanentAddress: address('Owner', '1 Farm Lane')
        }
      ]
    }
  ]
})

describe('Mapper A — current backend notification (as-is)', () => {
  it('Should round-trip every mapped obligation losslessly', () => {
    const answers = mappedAnswers()
    expect(notificationToAnswers(answersToNotification(answers))).toEqual(
      answers
    )
  })

  it('Should reshape a commodity line into the fixed backend commodity shape', () => {
    const { commodity } = answersToNotification(mappedAnswers())
    expect(commodity).toEqual({
      name: 'Cow',
      commodityComplement: [
        {
          typeOfCommodity: 'Domestic',
          totalNoOfAnimals: 25,
          totalNoOfPackages: 5,
          species: [
            {
              value: '1148346',
              text: 'Bos taurus',
              noOfAnimals: '25',
              noOfPackages: '5',
              earTag: 'UK123456789012',
              passport: 'UK123456789'
            }
          ]
        }
      ]
    })
  })

  it('Should place every storable answer in its skeleton field home', () => {
    const notification = answersToNotification({
      ...mappedAnswers(),
      transporterType: 'Commercial'
    })

    expect(notification.origin).toEqual({
      countryCode: 'FR',
      requiresRegionCode: 'Yes',
      internalReference: 'Imports456GB'
    })
    expect(notification.additionalDetails).toEqual({
      certifiedFor: 'Further keeping',
      unweanedAnimals: 'No'
    })
    expect(notification.reasonForImport).toBe('Internal market')
    expect(notification.placeOfOrigin).toEqual(
      address('Origin Farm', '1 Farm Lane')
    )
    expect(notification.consignor).toEqual(
      address('Consignor Ltd', '2 Depot Road')
    )
    expect(notification.consignee).toEqual(
      address('Consignee Ltd', '3 Dock Street')
    )
    expect(notification.importer).toEqual(address('Importer Ltd', '4 Port Way'))
    expect(notification.destination).toEqual(
      address('Destination Farm', '5 Field Lane')
    )
    expect(notification.consignment).toEqual(
      address('Contact Person', '6 High Street')
    )
    expect(notification.cphNumber).toBe('12/345/6789')
    expect(notification.transport.portOfEntry).toBe('ABERDEEN')
    expect(notification.transport.arrivalDate).toBe('2026-12-12')
    expect(notification.transport.transporter).toEqual({
      name: 'Transporter Co',
      approvalNumber: 'UK/NEWCA/T1/00090953',
      address: { addressLine1: '7 Route One' },
      type: 'Commercial'
    })
    expect(notification.commodity.commodityComplement[0].species[0]).toEqual({
      value: '1148346',
      text: 'Bos taurus',
      noOfAnimals: '25',
      noOfPackages: '5',
      earTag: 'UK123456789012',
      passport: 'UK123456789'
    })
  })

  it('Should convert the arrival date parts to an ISO string', () => {
    expect(answersToNotification(mappedAnswers()).transport.arrivalDate).toBe(
      '2026-12-12'
    )
  })

  it('Should omit every gap obligation from the notification', () => {
    const notification = answersToNotification(answersWithGaps())

    expect('responsiblePersonForLoad' in notification).toBe(false)
    expect('purpose' in notification).toBe(false)
    expect('declaration' in notification).toBe(false)
    expect('documents' in notification).toBe(false)
    expect('regionCode' in notification.origin).toBe(false)
    expect(Object.keys(notification.transport)).toEqual([
      'portOfEntry',
      'arrivalDate',
      'transporter'
    ])
    expect(
      'commodityCode' in notification.commodity.commodityComplement[0]
    ).toBe(false)
    expect(
      'animalIdentifiers' in notification.commodity.commodityComplement[0]
    ).toBe(false)
  })

  it('Should keep only earTag and passport on the species entry, dropping the five unit identifiers', () => {
    const notification = answersToNotification(answersWithGaps())
    const species = notification.commodity.commodityComplement[0].species[0]

    expect(species).toEqual({
      value: '1148346',
      text: 'Bos taurus',
      noOfAnimals: '25',
      noOfPackages: '5',
      earTag: 'UK123456789012',
      passport: 'UK123456789'
    })
    expect('animalIdentifiers' in notification.commodity).toBe(false)
  })

  it('Should lose every gap obligation across a full round-trip (pinning the lossiness)', () => {
    const answers = answersWithGaps()
    const recovered = notificationToAnswers(answersToNotification(answers))

    expect(recovered).not.toEqual(answers)
    // transporterType is no longer a gap — it is stored as transporter.type and
    // recovered — so it is absent from this dropped-keys list. privateTransporter
    // still drops: only the commercial variant survives the single Transporter.
    for (const key of [
      'responsiblePersonForLoad',
      'regionOfOriginCode',
      'purposeInInternalMarket',
      'privateTransporter',
      'meansOfTransport',
      'transportIdentification',
      'transportDocumentReference',
      'transitedCountries',
      'declaration',
      'documents'
    ]) {
      expect(key in recovered).toBe(false)
    }

    // earTag + passport survive; the other five unit identifiers do not.
    expect(recovered.commodityLines[0].animalIdentifiers).toEqual([
      {
        animalIdentifierEarTag: 'UK123456789012',
        animalIdentifierPassport: 'UK123456789'
      }
    ])
  })
})

// A fixture exercising all 46 obligations: multi-line commodities, multiple
// animal-identifier units per line using every identifier type, region code,
// purpose, all transport fields and a typed documents collection. Only the
// commercial transporter is present — transporterType gates commercial and
// private mutually exclusively (activatedBy + wipeOnExit), so exactly one is
// ever in scope, and the target notification carries a single Transporter.
const allAnswers = () => ({
  referenceNumber: 'GBN-AG-26-ABC123',
  responsiblePersonForLoad: {
    responsiblePerson: 'Auth User',
    responsiblePersonEmail: 'auth@example.com'
  },
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'Yes',
  regionOfOriginCode: 'FR-75',
  internalReferenceNumber: 'Imports456GB',
  animalsCertifiedFor: 'Further keeping',
  containsUnweanedAnimals: 'No',
  reasonForImport: 'Internal market',
  purposeInInternalMarket: 'Breeding',
  placeOfOrigin: address('Origin Farm', '1 Farm Lane'),
  consignor: address('Consignor Ltd', '2 Depot Road'),
  consignee: address('Consignee Ltd', '3 Dock Street'),
  importer: address('Importer Ltd', '4 Port Way'),
  placeOfDestination: address('Destination Farm', '5 Field Lane'),
  contactAddress: address('Contact Person', '6 High Street'),
  transporterType: 'Commercial',
  commercialTransporter: {
    name: 'Transporter Co',
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: { addressLine1: '7 Route One' }
  },
  countyParishHoldingCph: '12/345/6789',
  portOfEntry: 'ABERDEEN',
  arrivalDateAtPort: { day: 12, month: 12, year: 2026 },
  meansOfTransport: 'Road Vehicle',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transitedCountries: ['France', 'Belgium'],
  declaration: ['confirmed'],
  commodityLines: [
    {
      commoditySelection: 'Cow',
      typeSelection: 'Domestic',
      speciesSelection: ['1148346'],
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [
        {
          animalIdentifierEarTag: 'UK123456789012',
          animalIdentifierPassport: 'UK123456789'
        },
        {
          animalIdentifierTattoo: 'AB1234',
          animalIdentifierDescription: 'Brown cow'
        }
      ]
    },
    {
      commoditySelection: 'Cat',
      typeSelection: 'Domestic',
      speciesSelection: ['felis-catus'],
      numberOfAnimalsQuantity: '2',
      animalIdentifiers: [
        {
          animalIdentifierPassport: 'UK-CAT-1',
          animalIdentifierIdentificationDetails: 'Microchip 900123',
          horseName: 'Not applicable',
          permanentAddress: address('Owner', '1 Farm Lane')
        }
      ]
    }
  ],
  documents: [
    {
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: '2025-12-12'
    },
    {
      accompanyingDocumentType: 'Air waybill',
      accompanyingDocumentAttachmentType: 'PNG',
      accompanyingDocumentReference: 'AWB-42',
      accompanyingDocumentDateOfIssue: '2025-11-01'
    }
  ]
})

describe('Mapper B — proposed target notification (superset, lossless on all 46)', () => {
  it('Should round-trip all 46 obligations losslessly', () => {
    const answers = allAnswers()
    expect(
      targetNotificationToAnswers(answersToTargetNotification(answers))
    ).toEqual(answers)
  })

  it('Should give every gap obligation a typed home in the target notification', () => {
    const notification = answersToTargetNotification(allAnswers())

    expect(notification.origin.regionCode).toBe('FR-75')
    expect(notification.purpose).toBe('Breeding')
    expect(notification.responsiblePersonForLoad).toBeDefined()
    expect(notification.declaration).toEqual(['confirmed'])
    expect(notification.transport).toMatchObject({
      transporter: {
        name: 'Transporter Co',
        approvalNumber: 'UK/NEWCA/T1/00090953',
        address: { addressLine1: '7 Route One' },
        type: 'Commercial'
      },
      meansOfTransport: 'Road Vehicle',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721',
      transitedCountries: ['France', 'Belgium']
    })
    expect(notification.documents).toHaveLength(2)
    expect(notification.documents[0]).toEqual({
      documentType: 'ITAHC',
      attachmentType: 'PDF',
      reference: 'GBHC1234567890',
      dateOfIssue: '2025-12-12'
    })
  })

  it('Should preserve multi-line commodities and full per-animal identifiers', () => {
    const notification = answersToTargetNotification(allAnswers())
    const complements = notification.commodity.commodityComplement

    expect(complements).toHaveLength(2)
    expect(complements[0].commodityCode).toBe('0102')
    expect(complements[1].commodityCode).toBe('01061900')
    expect(complements[0].animalIdentifiers).toEqual([
      { earTag: 'UK123456789012', passport: 'UK123456789' },
      { tattoo: 'AB1234', description: 'Brown cow' }
    ])
    expect(complements[1].animalIdentifiers[0]).toEqual({
      passport: 'UK-CAT-1',
      identificationDetails: 'Microchip 900123',
      horseName: 'Not applicable',
      permanentAddress: address('Owner', '1 Farm Lane')
    })
  })

  it('Should carry the storable species fields Mapper A does (counts + earTag/passport)', () => {
    const notification = answersToTargetNotification(mappedAnswers())
    expect(notification.commodity.commodityComplement[0].species[0]).toEqual({
      value: '1148346',
      text: 'Bos taurus',
      noOfAnimals: '25',
      noOfPackages: '5',
      earTag: 'UK123456789012',
      passport: 'UK123456789'
    })
  })

  it('Should be a superset of Mapper A — B contains every field A produces, plus extras', () => {
    const answers = allAnswers()
    const a = answersToNotification(answers)
    const b = answersToTargetNotification(answers)

    expect(b).toMatchObject(a)
    // ...plus the extras A has no home for.
    expect(b.purpose).toBe('Breeding')
    expect(b.documents).toBeDefined()
    expect(b.commodity.commodityComplement[0].commodityCode).toBeDefined()
  })

  it('Should collapse a private transporter into the single Transporter, then restore it', () => {
    const answers = {
      transporterType: 'Private',
      privateTransporter: {
        name: 'Jane Private',
        address: { addressLine1: '9 Private Road' }
      }
    }
    const notification = answersToTargetNotification(answers)
    expect(notification.transport.transporter).toEqual({
      name: 'Jane Private',
      address: { addressLine1: '9 Private Road' },
      type: 'Private'
    })
    expect(targetNotificationToAnswers(notification)).toEqual(answers)
  })
})

// Prunes a Mapper B notification down to exactly what the real backend keeps —
// the typed POJO fields (Origin, AdditionalDetails, Commodity/CommodityComplement
// /Species, Transport/Transporter, the five party addresses, consignment,
// cphNumber). Everything else (origin.regionCode, purpose, the split transport
// fields, per-complement commodityCode + animalIdentifiers, documents,
// declaration, responsiblePersonForLoad) has no backend home and is dropped,
// exactly as Jackson would drop unknown JSON on deserialisation.
const storableSubset = (notification) => {
  const out = {}
  const keep = (key) => {
    if (notification[key] !== undefined) out[key] = notification[key]
  }
  const pick = (obj, keys) => {
    const picked = {}
    for (const key of keys) {
      if (obj?.[key] !== undefined) picked[key] = obj[key]
    }
    return picked
  }

  keep('referenceNumber')
  keep('reasonForImport')
  keep('additionalDetails')
  for (const key of [
    'placeOfOrigin',
    'consignor',
    'consignee',
    'importer',
    'destination',
    'consignment',
    'cphNumber'
  ]) {
    keep(key)
  }

  if (notification.origin) {
    out.origin = pick(notification.origin, [
      'countryCode',
      'requiresRegionCode',
      'internalReference'
    ])
  }
  if (notification.transport) {
    out.transport = pick(notification.transport, ['portOfEntry', 'arrivalDate'])
    if (notification.transport.transporter) {
      out.transport.transporter = pick(notification.transport.transporter, [
        'name',
        'address',
        'approvalNumber',
        'type'
      ])
    }
  }
  if (notification.commodity) {
    out.commodity = {
      name: notification.commodity.name,
      commodityComplement: notification.commodity.commodityComplement.map(
        (complement) => ({
          ...pick(complement, [
            'typeOfCommodity',
            'totalNoOfAnimals',
            'totalNoOfPackages'
          ]),
          species: complement.species?.map((entry) =>
            pick(entry, [
              'value',
              'text',
              'noOfAnimals',
              'noOfPackages',
              'earTag',
              'passport'
            ])
          )
        })
      )
    }
  }
  return out
}

// mappedAnswers is Mapper A's exact storable coverage, plus transporterType so
// the collapsed Transporter carries a type. This is the backend-storable set.
const storableAnswers = () => ({
  ...mappedAnswers(),
  transporterType: 'Commercial'
})

describe('Mapper B storable superset — survives the real backend field set', () => {
  it('Should round-trip every storable answer through the backend-kept fields', () => {
    const answers = storableAnswers()
    const recovered = targetNotificationToAnswers(
      storableSubset(answersToTargetNotification(answers))
    )
    expect(recovered).toEqual(answers)
  })

  it('Should recover earTag and passport from species when the extra identifiers are dropped', () => {
    const recovered = targetNotificationToAnswers(
      storableSubset(answersToTargetNotification(storableAnswers()))
    )
    expect(recovered.commodityLines[0].animalIdentifiers).toEqual([
      {
        animalIdentifierEarTag: 'UK123456789012',
        animalIdentifierPassport: 'UK123456789'
      }
    ])
  })

  it('Should restore the commercial transporter object and its type from the single Transporter', () => {
    const recovered = targetNotificationToAnswers(
      storableSubset(answersToTargetNotification(storableAnswers()))
    )
    expect(recovered.transporterType).toBe('Commercial')
    expect(recovered.commercialTransporter).toEqual({
      name: 'Transporter Co',
      approvalNumber: 'UK/NEWCA/T1/00090953',
      address: { addressLine1: '7 Route One' }
    })
  })

  it('Should drop the Stage-2 extras that have no backend home', () => {
    const answers = {
      ...storableAnswers(),
      regionOfOriginCode: 'FR-75',
      purposeInInternalMarket: 'Breeding',
      meansOfTransport: 'Road Vehicle',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721',
      documents: [
        {
          accompanyingDocumentType: 'ITAHC',
          accompanyingDocumentReference: 'GBHC1234567890'
        }
      ],
      commodityLines: [
        {
          ...storableAnswers().commodityLines[0],
          animalIdentifiers: [
            {
              animalIdentifierEarTag: 'UK123456789012',
              animalIdentifierPassport: 'UK123456789',
              animalIdentifierTattoo: 'AB1234',
              animalIdentifierDescription: 'Brown cow'
            }
          ]
        }
      ]
    }
    const recovered = targetNotificationToAnswers(
      storableSubset(answersToTargetNotification(answers))
    )

    for (const key of [
      'regionOfOriginCode',
      'purposeInInternalMarket',
      'meansOfTransport',
      'transportIdentification',
      'transportDocumentReference',
      'documents'
    ]) {
      expect(key in recovered).toBe(false)
    }
    // The richer per-animal identifier fields (tattoo, description) have no
    // backend home; only earTag + passport survive, via the species entry.
    expect(recovered.commodityLines[0].animalIdentifiers).toEqual([
      {
        animalIdentifierEarTag: 'UK123456789012',
        animalIdentifierPassport: 'UK123456789'
      }
    ])
  })
})
