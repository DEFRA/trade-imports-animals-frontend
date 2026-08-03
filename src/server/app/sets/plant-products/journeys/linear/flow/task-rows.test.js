// Test scaffold from docs/add-a-set.md step 7.
import { beforeAll, describe, expect, it } from 'vitest'

import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import { configureFulfilmentRegistry } from '../../../../../bridge/fulfilment-registry.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NOT_STARTED
} from '../../../../../bridge/status/index.js'
import { makeScope } from '../../../../../engine/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { configureJourneyFlow } from '../../../../../flow/journey-flow.js'
import { rowEntry } from '../../../../../flow/navigation.js'
import { readyForCheckYourAnswers } from '../../../../../flow/section-status.js'
import { configureObligationSet } from '../../../../../model/obligations/manifest.js'
import {
  registerSetMount,
  withSetContext
} from '../../../../../shared/set-context.js'
import * as obligationSet from '../../../obligations/index.js'
import { featureEvaluationBindings } from '../features/evaluation.js'
import { dispatchPages } from '../features/index.js'
import { commodityAdditionalDetailsPage } from '../features/additional-details/page.js'
import { accompanyingDocumentsPage } from '../features/documents/page.js'
import { contactDetailsPage } from '../features/contact/page.js'
import { goodsMovementServicesPage } from '../features/goods-movement/page.js'
import {
  commodityBasicDescriptionPage,
  commodityBulkDetailsPage,
  commodityInputMethodPage,
  commoditySearchPage,
  commoditySummaryPage,
  varietyOfGenusAndSpeciesPage
} from '../features/commodities/page.js'
import {
  countryOfOriginPage,
  originOfImportPage
} from '../features/origin/page.js'
import { purposePage } from '../features/purpose/page.js'
import { transportBeforeBipPage } from '../features/transport/page.js'
import {
  consignorConfirmationPage,
  consignorCreatePage,
  tradersAddressesPage
} from '../features/traders/page.js'
import { FLOW_ONLY_KEYS, sections } from './flow.js'
import { rowParts, rowStatus, taskRowById, taskRows } from './task-rows.js'

const completeConsignor = {
  consignorName: 'Orchard Export SAS',
  consignorAddressLine1: '12 Rue des Vergers',
  consignorCity: 'Lyon',
  consignorTelephone: '+33 4 72 00 00 00',
  consignorCountry: 'FR',
  consignorEmail: 'exports@example.com'
}

describe('plant-products task rows', () => {
  beforeAll(() => {
    registerSetMount('plant-products', '/plant-products')
    configureObligationSet('plant-products', obligationSet)
    configureFulfilmentRegistry('plant-products', featureEvaluationBindings)
    configureJourneyFlow('plant-products', {
      sections,
      taskRows,
      rowStatus,
      flowOnlyKeys: FLOW_ONLY_KEYS
    })
    buildDispatch('plant-products', dispatchPages)
  })

  it('registers origin as the first row and enters country-of-origin', () => {
    expect(taskRows).toEqual([
      {
        id: 'origin',
        pages: [countryOfOriginPage, originOfImportPage]
      },
      {
        id: 'purpose',
        pages: [purposePage]
      },
      {
        id: 'commodities',
        pages: [
          commodityInputMethodPage,
          commoditySearchPage,
          commodityBasicDescriptionPage,
          varietyOfGenusAndSpeciesPage,
          commoditySummaryPage,
          commodityBulkDetailsPage
        ]
      },
      {
        id: 'additional-details',
        pages: [commodityAdditionalDetailsPage]
      },
      {
        id: 'transport',
        pages: [transportBeforeBipPage]
      },
      {
        id: 'goods-movement',
        pages: [goodsMovementServicesPage]
      },
      {
        id: 'contact',
        pages: [contactDetailsPage]
      },
      {
        id: 'documents',
        pages: [accompanyingDocumentsPage]
      },
      {
        id: 'traders',
        pages: [
          tradersAddressesPage,
          consignorCreatePage,
          consignorConfirmationPage
        ]
      }
    ])
    expect(
      withSetContext('plant-products', () =>
        rowEntry(taskRowById('origin'), makeScope({}), 'journey-1')
      )
    ).toBe('/plant-products/notifications/journey-1/country-of-origin')
    expect(
      withSetContext('plant-products', () =>
        rowEntry(
          taskRowById('purpose'),
          makeScope({ countryOfOrigin: 'FR' }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/about-the-consignment')
    expect(
      withSetContext('plant-products', () =>
        rowEntry(
          taskRowById('commodities'),
          makeScope({ countryOfOrigin: 'FR' }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/commodity-input-method')
    expect(
      withSetContext('plant-products', () =>
        rowEntry(
          taskRowById('additional-details'),
          makeScope({
            countryOfOrigin: 'FR',
            commodityLines: [{ commoditySelection: '08059000' }]
          }),
          'journey-1'
        )
      )
    ).toBe(
      '/plant-products/notifications/journey-1/commodity-additional-details'
    )
    expect(
      withSetContext('plant-products', () =>
        rowEntry(
          taskRowById('contact'),
          makeScope({
            countryOfOrigin: 'FR',
            commodityLines: [{ commoditySelection: '08059000' }]
          }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/contact-details')
    expect(
      withSetContext('plant-products', () =>
        rowEntry(
          taskRowById('documents'),
          makeScope({
            countryOfOrigin: 'FR',
            commodityLines: [{ commoditySelection: '08059000' }]
          }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/accompanying-documents')
    expect(
      withSetContext('plant-products', () =>
        rowEntry(
          taskRowById('traders'),
          makeScope({
            countryOfOrigin: 'FR',
            commodityLines: [{ commoditySelection: '08059000' }]
          }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/traders-addresses')
  })

  it('derives fallback row parts from the page dispatch', () => {
    expect(
      withSetContext('plant-products', () => rowParts(taskRowById('origin')))
    ).toEqual(['countryOfOrigin', 'countryOfConsignment', 'internalReference'])
    expect(
      withSetContext('plant-products', () => rowParts(taskRowById('purpose')))
    ).toEqual(['reasonForImport'])
    expect(
      withSetContext('plant-products', () =>
        rowParts(taskRowById('commodities'))
      )
    ).toEqual(['commodityInputMethod', 'commodityLines'])
    expect(
      withSetContext('plant-products', () => rowParts(taskRowById('transport')))
    ).toEqual([
      'borderControlPost',
      'inspectionPremises',
      'meansOfTransport',
      'transportIdentification',
      'transportDocumentReference',
      'arrivalDate',
      'arrivalTime',
      'usesContainers',
      'containers'
    ])
    expect(
      withSetContext('plant-products', () =>
        rowParts(taskRowById('additional-details'))
      )
    ).toEqual(['totalGrossWeight', 'grossVolume', 'grossVolumeUnit'])
    expect(
      withSetContext('plant-products', () => rowParts(taskRowById('documents')))
    ).toEqual(['accompanyingDocuments'])
    expect(
      withSetContext('plant-products', () =>
        rowParts(taskRowById('goods-movement'))
      )
    ).toEqual([
      'commonTransitConvention',
      'movementReferenceNumber',
      'usingGvms'
    ])
    expect(
      withSetContext('plant-products', () => rowParts(taskRowById('contact')))
    ).toEqual([
      'responsiblePersonName',
      'responsiblePersonEmail',
      'responsiblePersonTelephone'
    ])
    expect(
      withSetContext('plant-products', () => rowParts(taskRowById('traders')))
    ).toEqual([
      'destinationSameAsConsignee',
      'destinationName',
      'destinationAddressLine1',
      'destinationAddressLine2',
      'destinationAddressLine3',
      'destinationCity',
      'destinationPostcode',
      'destinationCountry',
      'packerName',
      'packerAddressLine1',
      'packerAddressLine2',
      'packerAddressLine3',
      'packerCity',
      'packerPostcode',
      'packerCountry',
      'consignorName',
      'consignorAddressLine1',
      'consignorAddressLine2',
      'consignorAddressLine3',
      'consignorCity',
      'consignorPostcode',
      'consignorTelephone',
      'consignorCountry',
      'consignorEmail'
    ])
  })

  it('keeps traders In progress without a consignor and completes only with both parties while optional fields stay optional', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('traders'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(statusFor({ destinationSameAsConsignee: false })).toBe(IN_PROGRESS)
    expect(statusFor({ destinationSameAsConsignee: true })).toBe(IN_PROGRESS)
    expect(
      statusFor({ destinationSameAsConsignee: true, ...completeConsignor })
    ).toBe(FULFILLED)
    expect(
      statusFor({
        destinationSameAsConsignee: false,
        destinationName: 'Paris Produce Market',
        destinationAddressLine1: '10 Rue des Plantes',
        destinationCity: 'Paris',
        destinationPostcode: '75001',
        destinationCountry: 'FR',
        ...completeConsignor
      })
    ).toBe(FULFILLED)
  })

  it('blocks review readiness without a consignor and unblocks with complete consignor and delivery answers', () => {
    const readyFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const allOtherRows = {
      countryOfOrigin: 'FR',
      countryOfConsignment: 'IE',
      reasonForImport: 'INTERNAL_MARKET',
      commodityInputMethod: 'MANUAL',
      commodityLines: [
        {
          commoditySelection: '08059000',
          numberOfPackages: 1,
          packageType: 'BX',
          quantity: 1,
          quantityType: 'PCS',
          netWeight: 1,
          species: [
            {
              eppoCode: 'CIDAC',
              genusAndSpecies: 'Citrus australasica'
            }
          ]
        }
      ],
      totalGrossWeight: '2',
      borderControlPost: 'GBLHR4PP',
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'AB12 CDE',
      transportDocumentReference: 'CMR-123',
      arrivalDate: '2026-08-20',
      arrivalTime: '14:50',
      usesContainers: false,
      commonTransitConvention: 'NO',
      usingGvms: false,
      responsiblePersonName: 'Isabel Irwin',
      responsiblePersonEmail: 'isabel@example.com',
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-001',
          issueDate: { day: '4', month: '12', year: '2025' }
        }
      ]
    }

    expect(readyFor(allOtherRows)).toBe(false)
    expect(
      readyFor({ ...allOtherRows, destinationSameAsConsignee: false })
    ).toBe(false)
    expect(
      readyFor({ ...allOtherRows, destinationSameAsConsignee: true })
    ).toBe(false)
    expect(
      readyFor({
        ...allOtherRows,
        destinationSameAsConsignee: true,
        ...completeConsignor
      })
    ).toBe(true)
    expect(
      readyFor({
        ...allOtherRows,
        destinationSameAsConsignee: false,
        destinationName: 'Paris Produce Market',
        destinationAddressLine1: '10 Rue des Plantes',
        destinationCity: 'Paris',
        destinationPostcode: '75001',
        destinationCountry: 'FR',
        ...completeConsignor
      })
    ).toBe(true)
  })

  it('moves contact from Not yet started to Completed with either contact method', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('contact'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(
      statusFor({
        responsiblePersonName: 'Isabel Irwin',
        responsiblePersonEmail: 'isabel@example.com'
      })
    ).toBe(FULFILLED)
    expect(
      statusFor({
        responsiblePersonName: 'Isabel Irwin',
        responsiblePersonTelephone: '+44 7700 900 982'
      })
    ).toBe(FULFILLED)
  })

  it('keeps documents incomplete until one complete entry satisfies the collection floor', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('documents'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(
      statusFor({
        accompanyingDocuments: [
          {
            documentType: 'PHYTOSANITARY_CERTIFICATE',
            documentReference: 'PHYTO-001'
          }
        ]
      })
    ).toBe(IN_PROGRESS)
    expect(
      statusFor({
        accompanyingDocuments: [
          {
            documentType: 'PHYTOSANITARY_CERTIFICATE',
            documentReference: 'PHYTO-001',
            issueDate: { day: '4', month: '12', year: '2025' }
          }
        ]
      })
    ).toBe(FULFILLED)
  })

  it('blocks readiness at the documents floor and unblocks it with one complete document', () => {
    const readyFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const allEarlierRows = {
      countryOfOrigin: 'FR',
      countryOfConsignment: 'IE',
      reasonForImport: 'INTERNAL_MARKET',
      commodityInputMethod: 'MANUAL',
      commodityLines: [
        {
          commoditySelection: '08059000',
          numberOfPackages: 1,
          packageType: 'BX',
          quantity: 1,
          quantityType: 'PCS',
          netWeight: 1,
          species: [
            {
              eppoCode: 'CIDAC',
              genusAndSpecies: 'Citrus australasica'
            }
          ]
        }
      ],
      totalGrossWeight: '2',
      borderControlPost: 'GBLHR4PP',
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'AB12 CDE',
      transportDocumentReference: 'CMR-123',
      arrivalDate: '2026-08-20',
      arrivalTime: '14:50',
      usesContainers: false,
      commonTransitConvention: 'NO',
      usingGvms: false,
      responsiblePersonName: 'Isabel Irwin',
      responsiblePersonEmail: 'isabel@example.com',
      destinationSameAsConsignee: true,
      ...completeConsignor
    }

    expect(readyFor(allEarlierRows)).toBe(false)
    expect(
      readyFor({
        ...allEarlierRows,
        accompanyingDocuments: [
          {
            documentType: 'PHYTOSANITARY_CERTIFICATE',
            documentReference: 'PHYTO-001',
            issueDate: { day: '4', month: '12', year: '2025' }
          }
        ]
      })
    ).toBe(true)
  })

  it('blocks readiness while contact is incomplete and unblocks it after a valid contact save', () => {
    const readyFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const allOtherRows = {
      countryOfOrigin: 'FR',
      countryOfConsignment: 'IE',
      reasonForImport: 'INTERNAL_MARKET',
      commodityInputMethod: 'MANUAL',
      commodityLines: [
        {
          commoditySelection: '08059000',
          numberOfPackages: 1,
          packageType: 'BX',
          quantity: 1,
          quantityType: 'PCS',
          netWeight: 1,
          species: [
            {
              eppoCode: 'CIDAC',
              genusAndSpecies: 'Citrus australasica'
            }
          ]
        }
      ],
      totalGrossWeight: '2',
      borderControlPost: 'GBLHR4PP',
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'AB12 CDE',
      transportDocumentReference: 'CMR-123',
      arrivalDate: '2026-08-20',
      arrivalTime: '14:50',
      usesContainers: false,
      commonTransitConvention: 'NO',
      usingGvms: false,
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-001',
          issueDate: { day: '4', month: '12', year: '2025' }
        }
      ],
      destinationSameAsConsignee: true,
      ...completeConsignor
    }

    expect(readyFor(allOtherRows)).toBe(false)
    expect(
      readyFor({
        ...allOtherRows,
        responsiblePersonName: 'Isabel Irwin',
        responsiblePersonTelephone: '+44 7700 900 982'
      })
    ).toBe(true)
  })

  it('moves additional details from Not yet started through In progress to Completed', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('additional-details'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(statusFor({ grossVolume: '5' })).toBe(IN_PROGRESS)
    expect(statusFor({ totalGrossWeight: '12' })).toBe(FULFILLED)
    expect(
      statusFor({
        totalGrossWeight: '12',
        grossVolume: '5',
        grossVolumeUnit: 'LITRES'
      })
    ).toBe(FULFILLED)
  })

  it('requires a reason for import to complete the purpose row', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('purpose'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(statusFor({ reasonForImport: 'INTERNAL_MARKET' })).toBe(FULFILLED)
  })

  it('keeps commodities incomplete until the collection floor and line obligations are complete', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('commodities'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(statusFor({ commodityInputMethod: 'MANUAL' })).toBe(IN_PROGRESS)
    expect(
      statusFor({
        commodityInputMethod: 'MANUAL',
        commodityLines: [{ commoditySelection: '08059000' }]
      })
    ).toBe(IN_PROGRESS)
    expect(
      statusFor({
        commodityInputMethod: 'MANUAL',
        commodityLines: [
          {
            commoditySelection: '08059000',
            numberOfPackages: 1,
            packageType: 'BX',
            quantity: 1,
            quantityType: 'PCS',
            netWeight: 1,
            species: [
              {
                eppoCode: 'CIDAC',
                genusAndSpecies: 'Citrus australasica'
              }
            ]
          }
        ]
      })
    ).toBe(FULFILLED)
  })

  it('requires both countries but not the optional reference to complete the origin row', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('origin'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(statusFor({ countryOfOrigin: 'FR' })).toBe(IN_PROGRESS)
    expect(statusFor({ countryOfConsignment: 'IE' })).toBe(IN_PROGRESS)
    expect(
      statusFor({ countryOfOrigin: 'FR', countryOfConsignment: 'IE' })
    ).toBe(FULFILLED)
  })

  it('blocks readiness until the mandatory origin row is complete', () => {
    const readyFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(readyFor({})).toBe(false)
    expect(readyFor({ countryOfOrigin: 'FR' })).toBe(false)
    expect(
      readyFor({ countryOfOrigin: 'FR', countryOfConsignment: 'IE' })
    ).toBe(false)
    expect(
      readyFor({
        countryOfOrigin: 'FR',
        countryOfConsignment: 'IE',
        reasonForImport: 'INTERNAL_MARKET'
      })
    ).toBe(false)
  })

  it('moves the transport row from Not yet started through In progress to Completed', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('transport'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const complete = {
      borderControlPost: 'GBLHR4PP',
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'AB12 CDE',
      transportDocumentReference: 'CMR-123',
      arrivalDate: '2026-08-20',
      arrivalTime: '14:50',
      usesContainers: false
    }

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(statusFor({ borderControlPost: 'GBLHR4PP' })).toBe(IN_PROGRESS)
    expect(statusFor(complete)).toBe(FULFILLED)
    expect(
      statusFor({
        ...complete,
        usesContainers: true,
        containers: [
          {
            containerNumber: 'CONT-1',
            sealNumber: '',
            officialSeal: false
          }
        ]
      })
    ).toBe(FULFILLED)
    expect(statusFor({ ...complete, usesContainers: true })).toBe(FULFILLED)
  })

  it('moves goods movement from Not yet started through In progress to Completed on both CTC branches', () => {
    const statusFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById('goods-movement'),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(statusFor({})).toBe(NOT_STARTED)
    expect(statusFor({ commonTransitConvention: 'NO' })).toBe(IN_PROGRESS)
    expect(statusFor({ commonTransitConvention: 'NO', usingGvms: false })).toBe(
      FULFILLED
    )
    expect(
      statusFor({
        commonTransitConvention: 'ADD_MRN_NOW',
        movementReferenceNumber: '24GB123456789AB012',
        usingGvms: true
      })
    ).toBe(FULFILLED)
    expect(
      withSetContext('plant-products', () =>
        rowEntry(
          taskRowById('goods-movement'),
          makeScope({
            countryOfOrigin: 'FR',
            commodityLines: [{ commoditySelection: '08059000' }]
          }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/goods-movement-services')
  })

  it('blocks readiness while transport is incomplete and unblocks it when complete', () => {
    const readyFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const earlierRows = {
      countryOfOrigin: 'FR',
      countryOfConsignment: 'IE',
      reasonForImport: 'INTERNAL_MARKET',
      commodityInputMethod: 'MANUAL',
      commodityLines: [
        {
          commoditySelection: '08059000',
          numberOfPackages: 1,
          packageType: 'BX',
          quantity: 1,
          quantityType: 'PCS',
          netWeight: 1,
          species: [
            {
              eppoCode: 'CIDAC',
              genusAndSpecies: 'Citrus australasica'
            }
          ]
        }
      ],
      totalGrossWeight: '2',
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-001',
          issueDate: { day: '4', month: '12', year: '2025' }
        }
      ],
      commonTransitConvention: 'NO',
      usingGvms: false,
      responsiblePersonName: 'Isabel Irwin',
      responsiblePersonEmail: 'isabel@example.com',
      destinationSameAsConsignee: true,
      ...completeConsignor
    }
    const completedTransport = {
      borderControlPost: 'GBLHR4PP',
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'AB12 CDE',
      transportDocumentReference: 'CMR-123',
      arrivalDate: '2026-08-20',
      arrivalTime: '14:50',
      usesContainers: false
    }

    expect(
      readyFor({
        countryOfOrigin: 'FR',
        countryOfConsignment: 'IE',
        reasonForImport: 'INTERNAL_MARKET',
        ...completedTransport
      })
    ).toBe(false)
    expect(readyFor(earlierRows)).toBe(false)
    expect(
      readyFor({
        ...earlierRows,
        ...completedTransport
      })
    ).toBe(true)
  })

  it('blocks readiness while additional details is incomplete and unblocks it when complete', () => {
    const readyFor = (answers) =>
      withSetContext('plant-products', () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const allOtherRows = {
      countryOfOrigin: 'FR',
      countryOfConsignment: 'IE',
      reasonForImport: 'INTERNAL_MARKET',
      commodityInputMethod: 'MANUAL',
      commodityLines: [
        {
          commoditySelection: '08059000',
          numberOfPackages: 1,
          packageType: 'BX',
          quantity: 1,
          quantityType: 'PCS',
          netWeight: 1,
          species: [
            {
              eppoCode: 'CIDAC',
              genusAndSpecies: 'Citrus australasica'
            }
          ]
        }
      ],
      borderControlPost: 'GBLHR4PP',
      meansOfTransport: 'ROAD_VEHICLE',
      transportIdentification: 'AB12 CDE',
      transportDocumentReference: 'CMR-123',
      arrivalDate: '2026-08-20',
      arrivalTime: '14:50',
      usesContainers: false,
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-001',
          issueDate: { day: '4', month: '12', year: '2025' }
        }
      ],
      commonTransitConvention: 'NO',
      usingGvms: false,
      responsiblePersonName: 'Isabel Irwin',
      responsiblePersonEmail: 'isabel@example.com',
      destinationSameAsConsignee: true,
      ...completeConsignor
    }

    const {
      commonTransitConvention: _commonTransitConvention,
      usingGvms: _usingGvms,
      ...withoutGoodsMovement
    } = allOtherRows
    expect(readyFor(allOtherRows)).toBe(false)
    expect(readyFor({ ...allOtherRows, grossVolume: '5' })).toBe(false)
    expect(readyFor({ ...withoutGoodsMovement, totalGrossWeight: '2' })).toBe(
      false
    )
    expect(
      readyFor({
        ...withoutGoodsMovement,
        totalGrossWeight: '2',
        commonTransitConvention: 'NO'
      })
    ).toBe(false)
    expect(readyFor({ ...allOtherRows, totalGrossWeight: '2' })).toBe(true)
  })
})
