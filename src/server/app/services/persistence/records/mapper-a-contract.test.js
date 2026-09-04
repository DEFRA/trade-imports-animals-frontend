import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import { fulfilmentToNotification } from './mapper.js'

const { values: completeJourneyAnswers } = JSON.parse(
  readFileSync(
    new URL(
      '../../../sets/live-animals/journeys/linear/flow/fixtures/happy-path.json',
      import.meta.url
    ),
    'utf8'
  )
)

// The happy-path fixture also contains an ITAHC document. Mapper A's current
// backend shape has no documents field, so its exact absence is part of this
// payload contract; mapper-a-enum-contract.test.js separately pins all 14
// accepted document types and all 16 certifiedFor values.
const UNITED_KINGDOM = 'United Kingdom'
const CONTRACT_REFERENCE = 'GBN-AG-26-CONTRACT'

describe('Mapper A PUT /notifications contract', () => {
  test('emits the exact backend payload from a complete canonical fulfilment', () => {
    const fulfilment = assembleFulfilments(completeJourneyAnswers)

    expect(fulfilmentToNotification(fulfilment, CONTRACT_REFERENCE)).toEqual({
      referenceNumber: CONTRACT_REFERENCE,
      reasonForImport: 'internalMarket',
      // The happy-path fixture still carries an id-less copy (the retired
      // pre-EUDPA-198 shape: addressLine3, no townOrCity/postalOrZipCode), so
      // the mapper keeps the details. A picker answer with addressId maps to a
      // reference instead — see the test below.
      placeOfOrigin: {
        name: 'Origin Farm',
        address: {
          addressLine1: '1 Farm Lane',
          addressLine2: 'County Clare',
          countryCode: 'IE'
        }
      },
      consignor: {
        name: 'Astra Rosales',
        address: {
          addressLine1: '43 East Hague Extension',
          addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
          addressLine3: 'Quasoccaecat ut ear, 30055',
          country: 'Switzerland'
        }
      },
      consignee: {
        name: 'British Livestock Ltd',
        address: {
          addressLine1: '10 Market Street',
          addressLine2: 'Leeds LS1 6HB',
          country: UNITED_KINGDOM
        }
      },
      importer: {
        name: 'Import Co UK',
        address: {
          addressLine1: '20 Trade Road',
          addressLine2: 'London EC1A 1BB',
          country: UNITED_KINGDOM
        }
      },
      destination: {
        name: 'Tech Imports Ltd',
        address: {
          addressLine1: '643 Main Street',
          addressLine2: 'Birmingham G1 3AZ',
          country: UNITED_KINGDOM
        }
      },
      // Same id-less-copy translation as placeOfOrigin. The fixture's
      // addressLine3 has no home on the notification.
      consignment: {
        name: 'Animal and Plant Health Agency',
        address: {
          addressLine1: 'Woodham Lane',
          addressLine2: 'New Haw',
          countryCode: 'GB'
        }
      },
      cphNumber: '12/345/6789',
      origin: {
        countryCode: 'FR',
        requiresRegionCode: 'yes',
        internalReference: 'Imports456GB'
      },
      additionalDetails: {
        certifiedFor: 'slaughter',
        unweanedAnimals: 'no'
      },
      transport: {
        portOfEntry: 'GB ABD',
        arrivalDate: '2026-12-12',
        transporter: {
          name: 'García Livestock Transport SL',
          address: {
            addressLine1: '43 East Hague Extension',
            addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
            addressLine3: 'Quasoccaecat ut ear, 30055',
            country: 'Switzerland'
          },
          approvalNumber: 'ES-T2-45001294',
          type: 'Commercial'
        }
      },
      commodity: {
        name: 'Cow',
        commodityComplement: [
          {
            typeOfCommodity: 'Domestic',
            totalNoOfAnimals: 1,
            totalNoOfPackages: 5,
            species: [
              {
                value: '1148346',
                text: 'Bos taurus',
                noOfAnimals: '1',
                noOfPackages: '5',
                earTag: 'UK123456789012'
              }
            ]
          }
        ]
      }
    })
  })

  test('emits origin and contact as addressId when the answer is a reference', () => {
    const answers = {
      ...completeJourneyAnswers,
      placeOfOrigin: { addressId: 'origin-farm' },
      contactAddress: { addressId: 'apha' }
    }
    const payload = fulfilmentToNotification(
      assembleFulfilments(answers),
      CONTRACT_REFERENCE
    )

    expect(payload.placeOfOrigin).toEqual({ addressId: 'origin-farm' })
    expect(payload.consignment).toEqual({ addressId: 'apha' })
  })
})
