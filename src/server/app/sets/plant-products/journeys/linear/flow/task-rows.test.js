// Test scaffold from docs/add-a-set.md step 7.
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import { configureFulfilmentRegistry } from '../../../../../bridge/fulfilment-registry.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NOT_STARTED,
  OPTIONAL
} from '../../../../../bridge/status/index.js'
import { makeScope } from '../../../../../engine/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { configureJourneyFlow } from '../../../../../flow/journey-flow.js'
import { nextInSection, rowEntry } from '../../../../../flow/navigation.js'
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
import { reviewNotificationPage } from '../features/check-answers/page.js'
import { confirmationPage } from '../features/confirmation/page.js'
import { declarationPage } from '../features/declaration/page.js'
import { contactDetailsPage } from '../features/contact/page.js'
import { nominatedContactPage } from '../features/nominated-contacts/page.js'
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
  consignorPickerPage,
  tradersAddressesPage
} from '../features/traders/page.js'
import { FLOW_ONLY_KEYS, sections } from './flow.js'
import { rowParts, rowStatus, taskRowById, taskRows } from './task-rows.js'
import { nominatedContacts as nominatedContactsObligation } from '../../../obligations/index.js'
import { packageTypeOptions } from '../../../services/reference/package-types.js'
import { quantityTypeOptions } from '../../../services/reference/quantity-types.js'

const SET_ID = 'plant-products'
const SET_BASE = '/plant-products'

const ADDITIONAL_DETAILS_ID = 'additional-details'
const GOODS_MOVEMENT_ID = 'goods-movement'
const NOMINATED_CONTACTS_ID = 'nominated-contacts'
const RESPONSIBLE_PERSON_NAME = 'Isabel Irwin'
const RESPONSIBLE_PERSON_TELEPHONE = '+44 7700 900 982'
const BROKER_CONTACT_NAME = 'Blair Broker'

const { values: happyPath } = JSON.parse(
  readFileSync(new URL('./fixtures/happy-path.json', import.meta.url))
)

const TRADERS_ROW_PARTS = [
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
]

const completeConsignor = {
  consignorName: 'Orchard Export SAS',
  consignorAddressLine1: '12 Rue des Vergers',
  consignorCity: 'Lyon',
  consignorTelephone: '+33 4 72 00 00 00',
  consignorCountry: 'FR',
  consignorEmail: 'exports@example.com'
}

const withoutAnswers = (answers, ...keys) =>
  Object.fromEntries(
    Object.entries(answers).filter(([name]) => !keys.includes(name))
  )

const consignorKeys = Object.keys(completeConsignor)
const transportKeys = [
  'borderControlPost',
  'inspectionPremises',
  'meansOfTransport',
  'transportIdentification',
  'transportDocumentReference',
  'arrivalDate',
  'arrivalTime',
  'usesContainers',
  'containers'
]
const additionalDetailsKeys = [
  'totalGrossWeight',
  'grossVolume',
  'grossVolumeUnit'
]

describe('plant-products task rows', () => {
  beforeAll(() => {
    registerSetMount(SET_ID, SET_BASE)
    configureObligationSet(SET_ID, obligationSet)
    configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
    configureJourneyFlow(SET_ID, {
      sections,
      taskRows,
      rowStatus,
      flowOnlyKeys: FLOW_ONLY_KEYS
    })
    buildDispatch(SET_ID, dispatchPages)
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
        id: ADDITIONAL_DETAILS_ID,
        pages: [commodityAdditionalDetailsPage]
      },
      {
        id: 'transport',
        pages: [transportBeforeBipPage]
      },
      {
        id: GOODS_MOVEMENT_ID,
        pages: [goodsMovementServicesPage]
      },
      {
        id: 'contact',
        pages: [contactDetailsPage]
      },
      {
        id: NOMINATED_CONTACTS_ID,
        pages: [nominatedContactPage]
      },
      {
        id: 'documents',
        pages: [accompanyingDocumentsPage]
      },
      {
        id: 'traders',
        pages: [
          tradersAddressesPage,
          consignorPickerPage,
          consignorCreatePage,
          consignorConfirmationPage
        ]
      }
    ])
    expect(
      withSetContext(SET_ID, () =>
        rowEntry(taskRowById('origin'), makeScope({}), 'journey-1')
      )
    ).toBe('/plant-products/notifications/journey-1/country-of-origin')
    expect(
      withSetContext(SET_ID, () =>
        rowEntry(
          taskRowById('purpose'),
          makeScope({ countryOfOrigin: 'FR' }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/about-the-consignment')
    expect(
      withSetContext(SET_ID, () =>
        rowEntry(
          taskRowById('commodities'),
          makeScope({ countryOfOrigin: 'FR' }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/commodity-input-method')
    expect(
      withSetContext(SET_ID, () =>
        rowEntry(
          taskRowById(ADDITIONAL_DETAILS_ID),
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
      withSetContext(SET_ID, () =>
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
      withSetContext(SET_ID, () =>
        rowEntry(
          taskRowById(NOMINATED_CONTACTS_ID),
          makeScope({
            countryOfOrigin: 'FR',
            commodityLines: [{ commoditySelection: '08059000' }]
          }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/nominated-contact')
    expect(
      withSetContext(SET_ID, () =>
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
      withSetContext(SET_ID, () =>
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

  it('registers review-notification as the review section entry page', () => {
    expect(sections.find(({ id }) => id === 'review')?.pages).toEqual([
      reviewNotificationPage,
      declarationPage,
      confirmationPage
    ])
  })

  it('marks every mandatory row complete from the canonical happy-path fixture', () => {
    const { evaluation, inScope, statuses } = withSetContext(SET_ID, () => {
      const evaluation = evaluateAnswers(happyPath)
      const { inScope } = makeScope(happyPath)
      return {
        evaluation,
        inScope,
        statuses: Object.fromEntries(
          taskRows.map((row) => [
            row.id,
            rowStatus(row, happyPath, inScope, evaluation)
          ])
        )
      }
    })

    expect(statuses).toEqual({
      origin: FULFILLED,
      purpose: FULFILLED,
      commodities: FULFILLED,
      [ADDITIONAL_DETAILS_ID]: FULFILLED,
      transport: FULFILLED,
      [GOODS_MOVEMENT_ID]: FULFILLED,
      contact: FULFILLED,
      [NOMINATED_CONTACTS_ID]: OPTIONAL,
      documents: FULFILLED,
      traders: FULFILLED
    })
    expect(
      withSetContext(SET_ID, () =>
        readyForCheckYourAnswers(happyPath, inScope, evaluation)
      )
    ).toBe(true)

    const [commodityLine] = happyPath.commodityLines
    expect(packageTypeOptions.map(({ value }) => value)).toContain(
      commodityLine.packageType
    )
    expect(quantityTypeOptions.map(({ value }) => value)).toContain(
      commodityLine.quantityType
    )
  })

  it('derives fallback row parts from the page dispatch', () => {
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById('origin')))
    ).toEqual(['countryOfOrigin', 'countryOfConsignment', 'internalReference'])
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById('purpose')))
    ).toEqual(['reasonForImport'])
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById('commodities')))
    ).toEqual(['commodityInputMethod', 'commodityLines'])
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById('transport')))
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
      withSetContext(SET_ID, () => rowParts(taskRowById(ADDITIONAL_DETAILS_ID)))
    ).toEqual(['totalGrossWeight', 'grossVolume', 'grossVolumeUnit'])
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById('documents')))
    ).toEqual(['accompanyingDocuments'])
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById(GOODS_MOVEMENT_ID)))
    ).toEqual([
      'commonTransitConvention',
      'movementReferenceNumber',
      'usingGvms'
    ])
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById('contact')))
    ).toEqual([
      'responsiblePersonName',
      'responsiblePersonEmail',
      'responsiblePersonTelephone'
    ])
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById(NOMINATED_CONTACTS_ID)))
    ).toEqual(['nominatedContacts'])
    expect(
      withSetContext(SET_ID, () => rowParts(taskRowById('traders')))
    ).toEqual(TRADERS_ROW_PARTS)
  })

  it('sends traders-addresses on to the consignor picker', () => {
    expect(
      withSetContext(SET_ID, () =>
        nextInSection(
          tradersAddressesPage.id,
          makeScope({
            countryOfOrigin: 'FR',
            commodityLines: [{ commoditySelection: '08059000' }],
            destinationSameAsConsignee: true
          }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/consignor-select')
    expect(sections.find(({ id }) => id === 'traders')?.pages).toEqual([
      tradersAddressesPage,
      consignorPickerPage,
      consignorCreatePage,
      consignorConfirmationPage
    ])
  })

  it('leaves the traders row parts and entry page untouched by the consignor picker insertion', () => {
    const traders = taskRowById('traders')

    expect(withSetContext(SET_ID, () => rowParts(traders))).toEqual(
      TRADERS_ROW_PARTS
    )
    expect(
      withSetContext(SET_ID, () =>
        rowEntry(
          traders,
          makeScope({
            countryOfOrigin: 'FR',
            commodityLines: [{ commoditySelection: '08059000' }]
          }),
          'journey-1'
        )
      )
    ).toBe('/plant-products/notifications/journey-1/traders-addresses')
  })

  it('keeps traders In progress without a consignor and completes only with both parties while optional fields stay optional', () => {
    const statusFor = (answers) =>
      withSetContext(SET_ID, () => {
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
      withSetContext(SET_ID, () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const allOtherRows = withoutAnswers(
      happyPath,
      'destinationSameAsConsignee',
      ...consignorKeys
    )

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
      withSetContext(SET_ID, () => {
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
        responsiblePersonName: RESPONSIBLE_PERSON_NAME,
        responsiblePersonEmail: 'isabel@example.com'
      })
    ).toBe(FULFILLED)
    expect(
      statusFor({
        responsiblePersonName: RESPONSIBLE_PERSON_NAME,
        responsiblePersonTelephone: RESPONSIBLE_PERSON_TELEPHONE
      })
    ).toBe(FULFILLED)
  })

  it('keeps zero nominated contacts Optional and completes with several independent contacts', () => {
    const statusFor = (answers) =>
      withSetContext(SET_ID, () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById(NOMINATED_CONTACTS_ID),
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })

    expect(nominatedContactsObligation.requires).toEqual({ maxEntries: 5 })
    expect(statusFor({})).toBe(OPTIONAL)
    expect(statusFor({ nominatedContacts: [] })).toBe(OPTIONAL)
    expect(
      statusFor({
        nominatedContacts: [
          { contactTelephone: RESPONSIBLE_PERSON_TELEPHONE },
          {
            contactName: BROKER_CONTACT_NAME,
            contactEmail: 'blair@example.com'
          }
        ]
      })
    ).toBe(IN_PROGRESS)
    expect(
      statusFor({
        nominatedContacts: [
          {
            contactName: 'Alex Inspector',
            contactEmail: 'alex@example.com',
            contactIsAgent: false
          },
          {
            contactName: BROKER_CONTACT_NAME,
            contactTelephone: RESPONSIBLE_PERSON_TELEPHONE,
            contactIsAgent: true
          }
        ]
      })
    ).toBe(FULFILLED)
  })

  it('keeps documents incomplete until one complete entry satisfies the collection floor', () => {
    const statusFor = (answers) =>
      withSetContext(SET_ID, () => {
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
      withSetContext(SET_ID, () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const allEarlierRows = withoutAnswers(happyPath, 'accompanyingDocuments')

    expect(readyFor(allEarlierRows)).toBe(false)
    expect(
      readyFor({
        ...allEarlierRows,
        accompanyingDocuments: happyPath.accompanyingDocuments
      })
    ).toBe(true)
    expect(
      readyFor({
        ...allEarlierRows,
        nominatedContacts: [],
        accompanyingDocuments: happyPath.accompanyingDocuments
      })
    ).toBe(true)
    expect(
      readyFor({
        ...allEarlierRows,
        nominatedContacts: [
          {
            contactName: 'Alex Inspector',
            contactEmail: 'alex@example.com'
          },
          {
            contactName: BROKER_CONTACT_NAME,
            contactTelephone: RESPONSIBLE_PERSON_TELEPHONE
          }
        ],
        accompanyingDocuments: happyPath.accompanyingDocuments
      })
    ).toBe(true)
  })

  it('blocks readiness while contact is incomplete and unblocks it after a valid contact save', () => {
    const readyFor = (answers) =>
      withSetContext(SET_ID, () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const allOtherRows = withoutAnswers(
      happyPath,
      'responsiblePersonName',
      'responsiblePersonEmail',
      'responsiblePersonTelephone'
    )

    expect(readyFor(allOtherRows)).toBe(false)
    expect(
      readyFor({
        ...allOtherRows,
        responsiblePersonName: RESPONSIBLE_PERSON_NAME,
        responsiblePersonTelephone: RESPONSIBLE_PERSON_TELEPHONE
      })
    ).toBe(true)
  })

  it('moves additional details from Not yet started through In progress to Completed', () => {
    const statusFor = (answers) =>
      withSetContext(SET_ID, () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById(ADDITIONAL_DETAILS_ID),
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
      withSetContext(SET_ID, () => {
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
      withSetContext(SET_ID, () => {
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
            packageType: 'BOX',
            quantity: 1,
            quantityType: 'PIECES',
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
      withSetContext(SET_ID, () => {
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
      withSetContext(SET_ID, () => {
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
      withSetContext(SET_ID, () => {
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
      withSetContext(SET_ID, () => {
        const { inScope } = makeScope(answers)
        return rowStatus(
          taskRowById(GOODS_MOVEMENT_ID),
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
      withSetContext(SET_ID, () =>
        rowEntry(
          taskRowById(GOODS_MOVEMENT_ID),
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
      withSetContext(SET_ID, () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const earlierRows = withoutAnswers(happyPath, ...transportKeys)
    const completedTransport = Object.fromEntries(
      Object.entries(happyPath).filter(([name]) => transportKeys.includes(name))
    )

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
      withSetContext(SET_ID, () => {
        const { inScope } = makeScope(answers)
        return readyForCheckYourAnswers(
          answers,
          inScope,
          evaluateAnswers(answers)
        )
      })
    const allOtherRows = withoutAnswers(happyPath, ...additionalDetailsKeys)

    const {
      commonTransitConvention: _commonTransitConvention,
      usingGvms: _usingGvms,
      ...withoutGoodsMovement
    } = allOtherRows
    expect(readyFor(allOtherRows)).toBe(false)
    expect(readyFor({ ...allOtherRows, grossVolume: 5 })).toBe(false)
    expect(readyFor({ ...withoutGoodsMovement, totalGrossWeight: 10 })).toBe(
      false
    )
    expect(
      readyFor({
        ...withoutGoodsMovement,
        totalGrossWeight: 10,
        commonTransitConvention: 'NO'
      })
    ).toBe(false)
    expect(readyFor({ ...allOtherRows, totalGrossWeight: 10 })).toBe(true)
  })
})
