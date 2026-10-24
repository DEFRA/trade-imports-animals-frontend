import { describe, expect, test } from 'vitest'
import { assembleFulfilments } from '../../../../bridge/assemble-fulfilments.js'
import { fulfilmentToNotification } from './index.js'
import {
  BISON_BISON,
  BOS_TAURUS,
  FELIS_CATUS,
  OSTRICHES_CODE,
  STRUTHIO
} from '../../../../sets/live-animals/journeys/linear/features/commodities/search/test-support.js'
import {
  CATTLE_CODE,
  OTHER_LIVE_MAMMALS_CODE
} from '../../../../sets/live-animals/services/commodities/rules.js'

const address = (name, line1) => ({
  name,
  address: { addressLine1: line1, postcode: 'AB1 2CD' }
})

const referenceNumber = 'GBN-AG-26-ABC123'
const ORIGIN_FARM_LINE1 = '1 Farm Lane'
const PORT_OF_ENTRY = 'GB ABD'
const ARRIVAL_DATE_ISO = '2026-12-12'
const TRANSPORTER_NAME = 'Transporter Co'
const currentNotificationFrom = (answers) =>
  fulfilmentToNotification(
    assembleFulfilments(answers),
    answers.referenceNumber ?? referenceNumber
  )

const mappedAnswers = () => ({
  referenceNumber: 'GBN-AG-26-ABC123',
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'Yes',
  internalReferenceNumber: 'Imports456GB',
  animalsCertifiedFor: 'Further keeping',
  containsUnweanedAnimals: 'No',
  reasonForImport: 'Internal market',
  placeOfOrigin: address('Origin Farm', '1 Farm Road'),
  consignor: address('Consignor Ltd', '2 Depot Road'),
  consignee: address('Consignee Ltd', '3 Dock Street'),
  importer: address('Importer Ltd', '4 Port Way'),
  placeOfDestination: address('Destination Farm', '5 Field Lane'),
  contactAddress: address('Animal and Plant Health Agency', '6 Woodham Lane'),
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
      commodityCode: CATTLE_CODE,
      speciesLatinName: BOS_TAURUS,
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
      commodityCode: CATTLE_CODE,
      speciesLatinName: BOS_TAURUS,
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
          permanentAddress: {
            name: 'Owner',
            address: {
              addressLine1: ORIGIN_FARM_LINE1,
              postcode: 'AB1 2CD',
              countryCode: 'FR',
              phone: '01234 567890',
              email: 'owner@example.com'
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

const groupedLines = () => [
  {
    commodityCode: CATTLE_CODE,
    speciesLatinName: BOS_TAURUS,
    commodityType: '16',
    numberOfPackages: '5',
    numberOfAnimalsQuantity: '25',
    animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
  },
  {
    commodityCode: CATTLE_CODE,
    speciesLatinName: BISON_BISON,
    commodityType: '16',
    numberOfPackages: '2',
    numberOfAnimalsQuantity: '10',
    animalIdentifiers: [{ animalIdentifierEarTag: 'UK000000000001' }]
  },
  {
    commodityCode: OTHER_LIVE_MAMMALS_CODE,
    speciesLatinName: FELIS_CATUS,
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

describe('Mapper A — backend notification', () => {
  test('Should reshape per-species lines into the fixed backend commodity shape', () => {
    const { commodity } = currentNotificationFrom(mappedAnswers())
    expect(commodity).toEqual({
      name: CATTLE_CODE,
      commodityComplement: [
        {
          typeOfCommodity: 'Domestic',
          totalNoOfAnimals: 25,
          totalNoOfPackages: 5,
          species: [
            {
              value: BOS_TAURUS,
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
    expect(commodity.name).toBe(CATTLE_CODE)
    expect(commodity.commodityComplement).toHaveLength(2)

    const [cattleComplement, catComplement] = commodity.commodityComplement
    expect(cattleComplement.totalNoOfAnimals).toBe(35)
    expect(cattleComplement.totalNoOfPackages).toBe(7)
    expect(cattleComplement.species.map((entry) => entry.value)).toEqual([
      BOS_TAURUS,
      BISON_BISON
    ])
    expect(cattleComplement.species.map((entry) => entry.noOfAnimals)).toEqual([
      '25',
      '10'
    ])
    expect(catComplement.totalNoOfAnimals).toBe(2)
    expect(catComplement.species).toEqual([
      {
        value: FELIS_CATUS,
        text: FELIS_CATUS,
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
    const [cattleComplement, catComplement] = commodity.commodityComplement
    expect(cattleComplement.typeOfCommodity).toBe('Domestic')
    expect('typeOfCommodity' in catComplement).toBe(false)
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
      address('Origin Farm', '1 Farm Road')
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
      address('Animal and Plant Health Agency', '6 Woodham Lane')
    )
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
      value: BOS_TAURUS,
      text: BOS_TAURUS,
      noOfAnimals: '25',
      noOfPackages: '5',
      earTag: 'UK123456789012',
      passport: 'UK123456789',
      animalIdentifiers: [{ earTag: 'UK123456789012', passport: 'UK123456789' }]
    })
  })

  test('Should send the arrival date parts as YYYY-MM-DD, with no time and no offset', () => {
    expect(currentNotificationFrom(mappedAnswers()).transport.arrivalDate).toBe(
      ARRIVAL_DATE_ISO
    )
  })

  test('Should leave a date-only field out when the day, month and year are all blank', () => {
    const blankDate = { day: '', month: '', year: '' }

    const notification = currentNotificationFrom({
      ...answersWithGaps(),
      arrivalDateAtPort: blankDate,
      exitDate: blankDate
    })

    expect('arrivalDate' in notification.transport).toBe(false)
    expect('exitDate' in notification).toBe(false)
  })

  test('Should map a country of origin subdivision to parent country and subdivision code', () => {
    const notification = currentNotificationFrom({
      ...mappedAnswers(),
      countryOfOrigin: 'ES-CN',
      countryOfOriginSubdivisionCode: 'ES-CN'
    })

    expect(notification.origin.countryCode).toBe('ES')
    expect(notification.origin.countrySubdivisionCode).toBe('ES-CN')
  })

  test('Should map region, internal-market purpose, destination, exit and transport details and leave out purpose, declaration and documents', () => {
    const notification = currentNotificationFrom(answersWithGaps())

    expect(Object.keys(notification).sort()).toEqual([
      'additionalDetails',
      'commodity',
      'consignee',
      'consignment',
      'consignor',
      'cphNumber',
      'destination',
      'destinationCountry',
      'exitDate',
      'importer',
      'origin',
      'placeOfOrigin',
      'portOfExit',
      'purposeInInternalMarket',
      'reasonForImport',
      'referenceNumber',
      'transport'
    ])
    expect(notification.origin).toEqual({
      countryCode: 'FR',
      requiresRegionCode: 'Yes',
      regionOfOriginCode: 'FR-75',
      internalReference: 'Imports456GB'
    })
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
    expect(notification.commodity.commodityComplement[0]).toEqual({
      typeOfCommodity: 'Domestic',
      totalNoOfAnimals: 25,
      totalNoOfPackages: 5,
      species: expect.any(Array)
    })
  })
})

describe('Mapper A — per-unit animal identifiers', () => {
  test('Should keep earTag, passport and microchip scalars first-unit-only, while animalIdentifiers carries every unit including tattoo, horse name and the translated permanent address', () => {
    const notification = currentNotificationFrom(answersWithGaps())
    const species = notification.commodity.commodityComplement[0].species[0]

    expect(species).toEqual({
      value: BOS_TAURUS,
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
          commodityCode: OTHER_LIVE_MAMMALS_CODE,
          speciesLatinName: FELIS_CATUS,
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ animalIdentifierMicrochip: '900987654321098' }]
        }
      ]
    })

    expect(notification.commodity.commodityComplement[0].species[0]).toEqual({
      value: FELIS_CATUS,
      text: FELIS_CATUS,
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
          commodityCode: CATTLE_CODE,
          speciesLatinName: BOS_TAURUS,
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

describe('Mapper A — a commodity line with no animal-identifier unit', () => {
  test('Should map a commodity line that carries no animal-identifier unit', () => {
    const notification = currentNotificationFrom({
      commodityLines: [
        {
          commodityCode: OSTRICHES_CODE,
          speciesLatinName: STRUTHIO,
          numberOfPackages: '1',
          numberOfAnimalsQuantity: '40'
        }
      ]
    })

    expect(notification.commodity.commodityComplement[0].species[0]).toEqual({
      value: STRUTHIO,
      text: STRUTHIO,
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

describe('Mapper A — territories leave as their ISO country', () => {
  test('Should send a territory chosen as the destination country as its parent country', () => {
    const notification = currentNotificationFrom({
      ...answersWithGaps(),
      reasonForImport: 'transit',
      destinationCountry: 'FR-MQ'
    })

    expect(notification.destinationCountry).toBe('FR')
  })

  test('Should send a country chosen as the destination country unchanged', () => {
    const notification = currentNotificationFrom({
      ...answersWithGaps(),
      reasonForImport: 'transit',
      destinationCountry: 'IE'
    })

    expect(notification.destinationCountry).toBe('IE')
  })

  test('Should send transited territories as their parent countries, each country once, in the order chosen', () => {
    const notification = currentNotificationFrom({
      ...answersWithGaps(),
      transitedCountries: ['ES-CN', 'FR', 'FR-MQ', 'BE']
    })

    expect(notification.transport.transitedCountries).toEqual([
      'ES',
      'FR',
      'BE'
    ])
  })
})
