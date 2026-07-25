import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import { fulfilmentToNotification } from './mapper.js'

const { values: completeJourneyAnswers } = JSON.parse(
  readFileSync(
    new URL('../../../flow/fixtures/happy-path.json', import.meta.url),
    'utf8'
  )
)

// The happy-path fixture also contains an ITAHC document. Mapper A's current
// backend shape has no documents field, so its exact absence is part of this
// payload contract; mapper-a-enum-contract.test.js separately pins all 14
// accepted document types and all 16 certifiedFor values.
describe('Mapper A PUT /notifications contract', () => {
  test('emits the exact backend payload from a complete canonical fulfilment', () => {
    const fulfilment = assembleFulfilments(completeJourneyAnswers)

    expect(fulfilmentToNotification(fulfilment, 'GBN-AG-26-CONTRACT')).toEqual({
      referenceNumber: 'GBN-AG-26-CONTRACT',
      reasonForImport: 'internalMarket',
      placeOfOrigin: {
        name: 'Origin Farm',
        address: {
          addressLine1: '1 Farm Lane',
          addressLine2: 'County Clare',
          country: 'Ireland'
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
          country: 'United Kingdom'
        }
      },
      importer: {
        name: 'Import Co UK',
        address: {
          addressLine1: '20 Trade Road',
          addressLine2: 'London EC1A 1BB',
          country: 'United Kingdom'
        }
      },
      destination: {
        name: 'Tech Imports Ltd',
        address: {
          addressLine1: '643 Main Street',
          addressLine2: 'Birmingham G1 3AZ',
          country: 'United Kingdom'
        }
      },
      consignment: {
        name: 'Animal and Plant Health Agency',
        address: {
          addressLine1: 'Woodham Lane',
          addressLine2: 'New Haw',
          addressLine3: 'Addlestone, KT15 3NB',
          country: 'United Kingdom'
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
})
