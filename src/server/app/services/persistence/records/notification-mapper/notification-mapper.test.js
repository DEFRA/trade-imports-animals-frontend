import { describe, expect, test } from 'vitest'
import { assembleFulfilments } from '../../../../bridge/assemble-fulfilments.js'
import { fulfilmentToNotification } from './index.js'

/** A party answer as the journey stores it — the journey has carried
 * `postalOrZipCode` since before the address book existed. */
const address = (name, line1) => ({
  name,
  address: { addressLine1: line1, postalOrZipCode: 'AB1 2CD' }
})

/** The same party as the notification holds it. The two inline roles
 * carry their details across, so the mapper translates them into the address
 * book's field names on the way. */
const inlineAddress = (name, line1) => ({
  name,
  address: { addressLine1: line1, postcode: 'AB1 2CD' }
})

const referenceNumber = 'GBN-AG-26-ABC123'
const ORIGIN_FARM_LINE1 = '1 Farm Lane'
const BOS_TAURUS = 'Bos taurus'
const currentNotificationFrom = (answers) =>
  fulfilmentToNotification(
    assembleFulfilments(answers),
    answers.referenceNumber ?? referenceNumber
  )

// Answers carrying only the obligations Mapper A maps to the current backend
// notification. One commodity line = one species, with one animal
// identifier unit carrying earTag + passport — two of the identifiers that
// have a home on the backend species entry.
const mappedAnswers = () => ({
  referenceNumber: 'GBN-AG-26-ABC123',
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'Yes',
  internalReferenceNumber: 'Imports456GB',
  animalsCertifiedFor: 'Further keeping',
  containsUnweanedAnimals: 'No',
  reasonForImport: 'Internal market',
  placeOfOrigin: address('Origin Farm', ORIGIN_FARM_LINE1),
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
// animal-identifier unit carrying the microchip (which does have a home) and
// the five dropped unit identifiers.
const answersWithGaps = () => ({
  ...mappedAnswers(),
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
          animalIdentifierMicrochip: '900123456789012',
          animalIdentifierTattoo: 'AB1234',
          horseName: 'Dobbin',
          animalIdentifierIdentificationDetails: 'Hive mark HM-2026-004',
          animalIdentifierDescription: 'Brown cow',
          permanentAddress: address('Owner', ORIGIN_FARM_LINE1)
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
    animalIdentifiers: [
      {
        animalIdentifierPassport: 'UK-CAT-1',
        animalIdentifierMicrochip: '900987654321098'
      }
    ]
  }
]

describe('Mapper A — current backend notification (as-is)', () => {
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
              text: BOS_TAURUS,
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
        passport: 'UK-CAT-1',
        microchip: '900987654321098'
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
      inlineAddress('Origin Farm', ORIGIN_FARM_LINE1)
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
      inlineAddress('Contact Person', '6 High Street')
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
      text: BOS_TAURUS,
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

  test('Should keep only earTag, passport and microchip on the species entry, dropping the five unit identifiers', () => {
    const notification = currentNotificationFrom(answersWithGaps())
    const species = notification.commodity.commodityComplement[0].species[0]

    expect(species).toEqual({
      value: '1148346',
      text: BOS_TAURUS,
      noOfAnimals: '25',
      noOfPackages: '5',
      earTag: 'UK123456789012',
      passport: 'UK123456789',
      microchip: '900123456789012'
    })
    expect('animalIdentifiers' in notification.commodity).toBe(false)
  })

  test('Should carry a unit identified only by its microchip onto the species entry', () => {
    const notification = currentNotificationFrom({
      commodityLines: [
        {
          commoditySelection: 'Cat',
          speciesSelection: '923501',
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierMicrochip: '900987654321098' }]
        }
      ]
    })

    expect(notification.commodity.commodityComplement[0].species[0]).toEqual({
      value: '923501',
      text: 'Felis catus',
      noOfAnimals: '2',
      noOfPackages: '1',
      microchip: '900987654321098'
    })
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
})

test('Mapper A should use the envelope id as the reference number', () => {
  const actual = fulfilmentToNotification(
    assembleFulfilments({
      referenceNumber: 'LEGACY-ANSWERS-REFERENCE',
      poApprovedReferenceNumber: 'SYSTEM-OBLIGATION-REFERENCE'
    }),
    'JOURNEY-ID'
  )

  expect(actual).toEqual({ referenceNumber: 'JOURNEY-ID' })
})
