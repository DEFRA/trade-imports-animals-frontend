import { describe, expect, test } from 'vitest'
import { assembleFulfilments } from '../../../../bridge/assemble-fulfilments.js'
import { fulfilmentToNotification } from './index.js'

/** A party answer in backend wire shape, as `answerForInlineParty` stores it
 * — see addresses/party-inline.js. */
const address = (name, line1) => ({
  name,
  address: { addressLine1: line1, postcode: 'AB1 2CD' }
})

const referenceNumber = 'GBN-AG-26-ABC123'
const ORIGIN_FARM_LINE1 = '1 Farm Lane'
const BOS_TAURUS = 'Bos taurus'
const SALMO_SALAR = 'Salmo salar'
const PORT_OF_ENTRY = 'GB ABD'
const ARRIVAL_DATE_ISO = '2026-12-12'
const TRANSPORTER_NAME = 'Transporter Co'
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
  placeOfOrigin: { addressId: 'origin-farm' },
  consignor: address('Consignor Ltd', '2 Depot Road'),
  consignee: address('Consignee Ltd', '3 Dock Street'),
  importer: address('Importer Ltd', '4 Port Way'),
  placeOfDestination: address('Destination Farm', '5 Field Lane'),
  contactAddress: { addressId: 'animal-and-plant-health-agency' },
  commercialTransporter: {
    name: TRANSPORTER_NAME,
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: { addressLine1: '7 Route One' }
  },
  countyParishHoldingCph: '12/345/6789',
  portOfEntry: PORT_OF_ENTRY,
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

// mappedAnswers plus the obligations beyond it: those Mapper A still has no
// home for (purpose, declaration, the documents collection), those it now maps
// (region code, internal-market purpose, destination country, exit port and
// date, the transport details), and a richer animal-identifier unit carrying
// microchip, tattoo, horse name and a permanent address.
const answersWithGaps = () => ({
  ...mappedAnswers(),
  regionOfOriginCode: 'FR-75',
  purposeInInternalMarket: 'Breeding',
  destinationCountry: 'DE',
  portOfExit: 'GB DVR',
  exitDate: { day: 20, month: 12, year: 2026 },
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
          // The identification page stores the journey's own names, not the
          // wire names the other parties are held in.
          permanentAddress: {
            name: 'Owner',
            address: {
              addressLine1: ORIGIN_FARM_LINE1,
              postalOrZipCode: 'AB1 2CD',
              country: 'France',
              telephoneNumber: '01234 567890',
              emailAddress: 'owner@example.com'
            }
          }
        },
        {
          animalIdentifierEarTag: 'UK000000000099',
          animalIdentifierPassport: 'UK000000099'
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
              passport: 'UK123456789',
              animalIdentifiers: [
                { earTag: 'UK123456789012', passport: 'UK123456789' }
              ]
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
        microchip: '900987654321098',
        animalIdentifiers: [
          { passport: 'UK-CAT-1', microchip: '900987654321098' }
        ]
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
    expect(notification.placeOfOrigin).toEqual({ addressId: 'origin-farm' })
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
    expect(notification.consignment).toEqual({
      addressId: 'animal-and-plant-health-agency'
    })
    expect(notification.cphNumber).toBe('12/345/6789')
    expect(notification.transport.portOfEntry).toBe(PORT_OF_ENTRY)
    expect(notification.transport.arrivalDate).toBe(ARRIVAL_DATE_ISO)
    expect(notification.transport.transporter).toEqual({
      name: TRANSPORTER_NAME,
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
      passport: 'UK123456789',
      animalIdentifiers: [{ earTag: 'UK123456789012', passport: 'UK123456789' }]
    })
  })

  test('Should convert the arrival date parts to an ISO string', () => {
    expect(currentNotificationFrom(mappedAnswers()).transport.arrivalDate).toBe(
      ARRIVAL_DATE_ISO
    )
  })

  test('Should omit the obligations with no home and map the newly homed ones', () => {
    const notification = currentNotificationFrom(answersWithGaps())

    expect('purpose' in notification).toBe(false)
    expect('declaration' in notification).toBe(false)
    expect('documents' in notification).toBe(false)
    expect('regionCode' in notification.origin).toBe(false)
    expect(notification.origin.regionOfOriginCode).toBe('FR-75')
    expect(notification.purposeInInternalMarket).toBe('Breeding')
    expect(notification.destinationCountry).toBe('DE')
    expect(notification.portOfExit).toBe('GB DVR')
    expect(notification.exitDate).toBe('2026-12-20')
    expect(notification.transport).toEqual({
      portOfEntry: PORT_OF_ENTRY,
      arrivalDate: ARRIVAL_DATE_ISO,
      transporter: expect.objectContaining({ name: TRANSPORTER_NAME }),
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721',
      transitedCountries: ['France', 'Belgium']
    })
    expect(
      'commodityCode' in notification.commodity.commodityComplement[0]
    ).toBe(false)
    expect('name' in notification.commodity.commodityComplement[0]).toBe(false)
  })
})

// Per-unit animal-identifier coverage — a separate describe from the block
// above, which is already at the file's max-lines-per-function ceiling.
describe('Mapper A — per-unit animal identifiers', () => {
  test('Should keep earTag, passport and microchip scalars first-unit-only, while animalIdentifiers carries every unit including tattoo, horse name and the translated permanent address', () => {
    const notification = currentNotificationFrom(answersWithGaps())
    const species = notification.commodity.commodityComplement[0].species[0]

    expect(species).toEqual({
      value: '1148346',
      text: BOS_TAURUS,
      noOfAnimals: '25',
      noOfPackages: '5',
      earTag: 'UK123456789012',
      passport: 'UK123456789',
      microchip: '900123456789012',
      animalIdentifiers: [
        {
          earTag: 'UK123456789012',
          passport: 'UK123456789',
          microchip: '900123456789012',
          tattoo: 'AB1234',
          horseName: 'Dobbin',
          permanentAddress: {
            name: 'Owner',
            phone: '01234 567890',
            email: 'owner@example.com',
            address: {
              addressLine1: ORIGIN_FARM_LINE1,
              postcode: 'AB1 2CD',
              countryCode: 'FR'
            }
          }
        },
        {
          earTag: 'UK000000000099',
          passport: 'UK000000099'
        }
      ]
    })
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
      microchip: '900987654321098',
      animalIdentifiers: [{ microchip: '900987654321098' }]
    })
  })

  test('Should keep the scalar earTag/passport as first-unit-only while animalIdentifiers carries every unit', () => {
    const firstUnit = { earTag: 'FIRST-EAR-TAG', passport: 'FIRST-PASSPORT' }
    const secondUnit = { earTag: 'SECOND-EAR-TAG', passport: 'SECOND-PASSPORT' }
    const notification = currentNotificationFrom({
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          animalIdentifiers: [
            {
              animalIdentifierEarTag: firstUnit.earTag,
              animalIdentifierPassport: firstUnit.passport
            },
            {
              animalIdentifierEarTag: secondUnit.earTag,
              animalIdentifierPassport: secondUnit.passport
            }
          ]
        }
      ]
    })

    const species = notification.commodity.commodityComplement[0].species[0]
    expect(species).toMatchObject(firstUnit)
    expect(species.animalIdentifiers).toEqual([firstUnit, secondUnit])
  })
})

// A commodity on none of the identifier allowlists carries no identifier
// obligation, so its line reaches the mapper with no animal-identifier unit at
// all. The species entry must be built from the line alone rather than
// throwing on a missing unit. Its own describe rather than the Mapper A block
// above, which is already at the file's max-lines-per-function ceiling.
describe('Mapper A — a commodity line with no animal-identifier unit', () => {
  test('Should map a commodity line that carries no animal-identifier unit', () => {
    const notification = currentNotificationFrom({
      commodityLines: [
        {
          commoditySelection: 'Fish',
          speciesSelection: '801204',
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '40'
        }
      ]
    })

    expect(notification.commodity.commodityComplement[0].species[0]).toEqual({
      value: '801204',
      text: SALMO_SALAR,
      noOfAnimals: '40',
      noOfPackages: '1'
    })
  })
})

describe('Mapper A — unanswered transport fields', () => {
  test('Should omit transport fields the arrival-details page saved as blank', () => {
    const { transport } = currentNotificationFrom({
      portOfEntry: PORT_OF_ENTRY,
      arrivalDateAtPort: { day: 12, month: 12, year: 2026 },
      meansOfTransport: '',
      transportIdentification: '',
      transportDocumentReference: ''
    })

    expect(transport).toEqual({
      portOfEntry: PORT_OF_ENTRY,
      arrivalDate: ARRIVAL_DATE_ISO
    })
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
