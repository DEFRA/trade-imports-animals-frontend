import { describe, expect, test } from 'vitest'
import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import { characterisationCorpus } from '../../../bridge/fixtures/characterisation-corpus.js'
import {
  answersToNotification,
  fulfilmentToNotification,
  notificationToAnswers,
  answersToTargetNotification,
  targetNotificationToAnswers
} from './notification-mapper.js'

const address = (name, line1) => ({
  name,
  address: { addressLine1: line1, postcode: 'AB1 2CD' }
})

const referenceNumber = 'GBN-AG-26-ABC123'
const currentNotificationFrom = (answers) =>
  fulfilmentToNotification(
    assembleFulfilments(answers),
    answers.referenceNumber ?? referenceNumber
  )

// Answers carrying only the obligations Mapper A maps to the current backend
// notification. One commodity line = one species, with one animal
// identifier unit carrying earTag + passport — the identifiers that DO have a
// home on the backend species entry.
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
  portOfEntry: 'GB ABD',
  arrivalDateAtPort: { day: 12, month: 12, year: 2026 },
  commodityLines: [
    {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      commodityType: '16',
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
  meansOfTransport: 'ROAD_VEHICLE',
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
      speciesSelection: '1148346',
      commodityType: '16',
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

// Two species on the same commodity plus a second commodity — the grouping
// case: one complement per commodity, per-species counts kept on the species
// entries, totals summed per complement.
const groupedLines = () => [
  {
    commoditySelection: 'Cow',
    speciesSelection: '1148346',
    commodityType: '16',
    numberOfPackages: '5',
    numberOfAnimalsQuantity: '25',
    animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
  },
  {
    commoditySelection: 'Cow',
    speciesSelection: '716661',
    commodityType: '16',
    numberOfPackages: '2',
    numberOfAnimalsQuantity: '10',
    animalIdentifiers: [{ animalIdentifierEarTag: 'UK000000000001' }]
  },
  {
    commoditySelection: 'Cat',
    speciesSelection: '923501',
    commodityType: '2',
    numberOfPackages: '1',
    numberOfAnimalsQuantity: '2',
    animalIdentifiers: [{ animalIdentifierPassport: 'UK-CAT-1' }]
  }
]

describe('Mapper A — current backend notification (as-is)', () => {
  test('Should round-trip every mapped obligation losslessly for a single commodity', () => {
    const answers = mappedAnswers()
    expect(notificationToAnswers(currentNotificationFrom(answers))).toEqual(
      answers
    )
  })

  test('Should reshape per-species lines into the fixed backend commodity shape', () => {
    const { commodity } = currentNotificationFrom(mappedAnswers())
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

  test('Should group lines by commodity, keep per-species counts and sum the complement totals', () => {
    const { commodity } = currentNotificationFrom({
      commodityLines: groupedLines()
    })
    expect(commodity.name).toBe('Cow')
    expect(commodity.commodityComplement).toHaveLength(2)

    const [cow, cat] = commodity.commodityComplement
    expect(cow.totalNoOfAnimals).toBe(35)
    expect(cow.totalNoOfPackages).toBe(7)
    expect(cow.species.map((entry) => entry.value)).toEqual([
      '1148346',
      '716661'
    ])
    expect(cow.species.map((entry) => entry.noOfAnimals)).toEqual(['25', '10'])
    expect(cat.totalNoOfAnimals).toBe(2)
    expect(cat.species).toEqual([
      {
        value: '923501',
        text: 'Felis catus',
        noOfAnimals: '2',
        noOfPackages: '1',
        passport: 'UK-CAT-1'
      }
    ])
  })

  test('Should derive typeOfCommodity from the commodity reference data, omitting it for commodities without a type', () => {
    const { commodity } = currentNotificationFrom({
      commodityLines: groupedLines()
    })
    const [cow, cat] = commodity.commodityComplement
    expect(cow.typeOfCommodity).toBe('Domestic')
    expect('typeOfCommodity' in cat).toBe(false)
  })

  test('Should lose the commodity identity of every group after the first on a round-trip (the lossy-A caveat)', () => {
    const recovered = notificationToAnswers(
      currentNotificationFrom({ commodityLines: groupedLines() })
    )
    expect(
      recovered.commodityLines.map((line) => line.commoditySelection)
    ).toEqual(['Cow', 'Cow', undefined])
    // The per-species split itself survives: counts come back per species.
    expect(
      recovered.commodityLines.map((line) => line.numberOfAnimalsQuantity)
    ).toEqual(['25', '10', '2'])
  })

  test('Should place every storable answer in its skeleton field home', () => {
    const notification = currentNotificationFrom({
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
    expect(notification.transport.portOfEntry).toBe('GB ABD')
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

  test('Should convert the arrival date parts to an ISO string', () => {
    expect(currentNotificationFrom(mappedAnswers()).transport.arrivalDate).toBe(
      '2026-12-12'
    )
  })

  test('Should omit every gap obligation from the notification', () => {
    const notification = currentNotificationFrom(answersWithGaps())

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
    expect('name' in notification.commodity.commodityComplement[0]).toBe(false)
    expect(
      'animalIdentifiers' in
        notification.commodity.commodityComplement[0].species[0]
    ).toBe(false)
  })

  test('Should keep only earTag and passport on the species entry, dropping the five unit identifiers', () => {
    const notification = currentNotificationFrom(answersWithGaps())
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

  test('Should intentionally keep ear tag and passport from only the first unit', () => {
    const notification = currentNotificationFrom({
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          animalIdentifiers: [
            {
              animalIdentifierEarTag: 'FIRST-EAR-TAG',
              animalIdentifierPassport: 'FIRST-PASSPORT'
            },
            {
              animalIdentifierEarTag: 'SECOND-EAR-TAG',
              animalIdentifierPassport: 'SECOND-PASSPORT'
            }
          ]
        }
      ]
    })

    expect(
      notification.commodity.commodityComplement[0].species[0]
    ).toMatchObject({
      earTag: 'FIRST-EAR-TAG',
      passport: 'FIRST-PASSPORT'
    })
    expect(JSON.stringify(notification)).not.toContain('SECOND-EAR-TAG')
    expect(JSON.stringify(notification)).not.toContain('SECOND-PASSPORT')
  })

  test('Should lose every gap obligation across a full round-trip (pinning the lossiness)', () => {
    const answers = answersWithGaps()
    const recovered = notificationToAnswers(currentNotificationFrom(answers))

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

describe('Mapper A — canonical fulfilment golden parity', () => {
  test('Should use the envelope id as the reference number', () => {
    const actual = fulfilmentToNotification(
      assembleFulfilments({
        referenceNumber: 'LEGACY-ANSWERS-REFERENCE',
        poApprovedReferenceNumber: 'SYSTEM-OBLIGATION-REFERENCE'
      }),
      'JOURNEY-ID'
    )

    expect(actual).toEqual({ referenceNumber: 'JOURNEY-ID' })
  })

  test.each(characterisationCorpus)(
    'Should deep- and byte-equal the answers oracle for increment-0 case $name',
    ({ answers }) => {
      const expected = answersToNotification({
        ...answers,
        referenceNumber
      })
      const actual = fulfilmentToNotification(
        assembleFulfilments(answers),
        referenceNumber
      )

      expect(actual).toEqual(expected)
      expect(JSON.stringify(actual)).toBe(JSON.stringify(expected))
    }
  )

  test.each([
    ['mapped answers', mappedAnswers()],
    ['known Mapper A gaps', answersWithGaps()],
    ['multi-commodity grouping', { commodityLines: groupedLines() }],
    [
      'private transporter',
      {
        transporterType: 'Private',
        privateTransporter: {
          name: 'Jane Private',
          address: { addressLine1: '9 Private Road' }
        }
      }
    ]
  ])(
    'Should deep- and byte-equal the answers oracle for %s',
    (_name, answers) => {
      const expected = answersToNotification({
        ...answers,
        referenceNumber
      })
      const actual = fulfilmentToNotification(
        assembleFulfilments(answers),
        referenceNumber
      )

      expect(actual).toEqual(expected)
      expect(JSON.stringify(actual)).toBe(JSON.stringify(expected))
    }
  )
})

// A fixture exercising every captured obligation: multi-commodity per-species
// lines, multiple animal-identifier units per line using every identifier
// type, region code, purpose, all transport fields and a typed documents
// collection. Only the commercial transporter is present — transporterType
// gates commercial and private mutually exclusively (activatedBy +
// wipeOnExit), so exactly one is ever in scope, and the target notification
// carries a single Transporter.
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
  portOfEntry: 'GB ABD',
  arrivalDateAtPort: { day: 12, month: 12, year: 2026 },
  meansOfTransport: 'ROAD_VEHICLE',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transitedCountries: ['France', 'Belgium'],
  declaration: ['confirmed'],
  commodityLines: [
    {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      commodityType: '16',
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
      commoditySelection: 'Cow',
      speciesSelection: '716661',
      commodityType: '16',
      numberOfPackages: '2',
      numberOfAnimalsQuantity: '10',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK000000000001' }]
    },
    {
      commoditySelection: 'Cat',
      speciesSelection: '923501',
      commodityType: '2',
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
      accompanyingDocumentType: 'AIR_WAYBILL',
      accompanyingDocumentAttachmentType: 'PNG',
      accompanyingDocumentReference: 'AWB-42',
      accompanyingDocumentDateOfIssue: '2025-11-01'
    }
  ]
})

test('Mapper A should deep- and byte-equal its oracle for the all-obligations fixture', () => {
  const answers = allAnswers()
  const expected = answersToNotification(answers)
  const actual = currentNotificationFrom(answers)

  expect(actual).toEqual(expected)
  expect(JSON.stringify(actual)).toBe(JSON.stringify(expected))
  expect(actual.commodity.commodityComplement[0].species[0]).not.toHaveProperty(
    'animalIdentifiers'
  )
})

describe('Mapper B — proposed target notification (superset, lossless)', () => {
  test('Should round-trip every captured obligation losslessly, including multi-commodity per-species lines', () => {
    const answers = allAnswers()
    expect(
      targetNotificationToAnswers(answersToTargetNotification(answers))
    ).toEqual(answers)
  })

  test('Should give every gap obligation a typed home in the target notification', () => {
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
      meansOfTransport: 'ROAD_VEHICLE',
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

  test('Should keep every group commodity identity and the full per-species identifier records', () => {
    const notification = answersToTargetNotification(allAnswers())
    const complements = notification.commodity.commodityComplement

    expect(complements).toHaveLength(2)
    expect(complements[0].commodityCode).toBe('0102')
    expect(complements[0].name).toBe('Cow')
    expect(complements[1].commodityCode).toBe('01061900')
    expect(complements[1].name).toBe('Cat')
    expect(complements[0].species[0].animalIdentifiers).toEqual([
      { earTag: 'UK123456789012', passport: 'UK123456789' },
      { tattoo: 'AB1234', description: 'Brown cow' }
    ])
    expect(complements[0].species[1].animalIdentifiers).toEqual([
      { earTag: 'UK000000000001' }
    ])
    expect(complements[1].species[0].animalIdentifiers).toEqual([
      {
        passport: 'UK-CAT-1',
        identificationDetails: 'Microchip 900123',
        horseName: 'Not applicable',
        permanentAddress: address('Owner', '1 Farm Lane')
      }
    ])
  })

  test('Should carry the storable species fields Mapper A does (counts + earTag/passport)', () => {
    const notification = answersToTargetNotification(mappedAnswers())
    expect(notification.commodity.commodityComplement[0].species[0]).toEqual({
      value: '1148346',
      text: 'Bos taurus',
      noOfAnimals: '25',
      noOfPackages: '5',
      earTag: 'UK123456789012',
      passport: 'UK123456789',
      animalIdentifiers: [{ earTag: 'UK123456789012', passport: 'UK123456789' }]
    })
  })

  test('Should be a superset of Mapper A — B contains every field A produces, plus extras', () => {
    const answers = allAnswers()
    const mapperANotification = answersToNotification(answers)
    const mapperBNotification = answersToTargetNotification(answers)

    expect(mapperBNotification).toMatchObject(mapperANotification)
    // ...plus the extras A has no home for.
    expect(mapperBNotification.purpose).toBe('Breeding')
    expect(mapperBNotification.documents).toBeDefined()
    expect(
      mapperBNotification.commodity.commodityComplement[0].commodityCode
    ).toBeDefined()
  })

  test('Should collapse a private transporter into the single Transporter, then restore it', () => {
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
// fields, per-complement commodityCode + name, per-species animalIdentifiers,
// documents, declaration, responsiblePersonForLoad) has no backend home and is
// dropped, exactly as Jackson would drop unknown JSON on deserialisation.
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
  test('Should round-trip every storable answer through the backend-kept fields', () => {
    const answers = storableAnswers()
    const recovered = targetNotificationToAnswers(
      storableSubset(answersToTargetNotification(answers))
    )
    expect(recovered).toEqual(answers)
  })

  test('Should recover earTag and passport from species when the extra identifiers are dropped', () => {
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

  test('Should restore the commercial transporter object and its type from the single Transporter', () => {
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

  test('Should drop the Stage-2 extras that have no backend home', () => {
    const answers = {
      ...storableAnswers(),
      regionOfOriginCode: 'FR-75',
      purposeInInternalMarket: 'Breeding',
      meansOfTransport: 'ROAD_VEHICLE',
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
