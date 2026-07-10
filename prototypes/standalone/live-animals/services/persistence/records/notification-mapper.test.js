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
      commoditySelection: '0102 - Cattle',
      typeSelection: 'domestic',
      speciesSelection: ['bos-taurus'],
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
  transporterType: 'Commercial transporter',
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
      commoditySelection: '0102 - Cattle',
      typeSelection: 'domestic',
      speciesSelection: ['bos-taurus'],
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
      name: '0102 - Cattle',
      commodityComplement: [
        {
          typeOfCommodity: 'domestic',
          totalNoOfAnimals: '25',
          totalNoOfPackages: '5',
          species: [
            {
              value: 'bos-taurus',
              text: 'bos-taurus',
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
  })

  it('Should keep only earTag and passport on the species entry, dropping the five unit identifiers', () => {
    const notification = answersToNotification(answersWithGaps())
    const species = notification.commodity.commodityComplement[0].species[0]

    expect(species).toEqual({
      value: 'bos-taurus',
      text: 'bos-taurus',
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
    for (const key of [
      'responsiblePersonForLoad',
      'regionOfOriginCode',
      'purposeInInternalMarket',
      'transporterType',
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
// animal-identifier units per line using every identifier type, both
// transporter types, region code, purpose, all transport fields and a typed
// documents collection.
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
  transporterType: 'Commercial transporter',
  commercialTransporter: {
    name: 'Transporter Co',
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: { addressLine1: '7 Route One' }
  },
  privateTransporter: address('Jane Private', '9 Private Road'),
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
      commoditySelection: '0102 - Cattle',
      typeSelection: 'domestic',
      speciesSelection: ['bos-taurus'],
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
      commoditySelection: '01061900 - Cats',
      typeSelection: 'domestic',
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
      transporterType: 'Commercial transporter',
      privateTransporter: expect.any(Object),
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
    expect(complements[0].commodityCode).toBe('0102 - Cattle')
    expect(complements[1].commodityCode).toBe('01061900 - Cats')
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
})
