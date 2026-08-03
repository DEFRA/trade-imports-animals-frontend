import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { evaluateAnswers } from './bridge/evaluation.js'
import { configureFulfilmentRegistry } from './bridge/fulfilment-registry.js'
import { walkObligations } from './bridge/obligation-source.js'
import { makeScope } from './engine/index.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { buildDispatch } from './flow/dispatch.js'
import { configureJourneyFlow } from './flow/journey-flow.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { enterSetContext } from './shared/set-context.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/plant-products/journeys/linear/config.js'
import { featureEvaluationBindings } from './sets/plant-products/journeys/linear/features/evaluation.js'
import { dispatchPages } from './sets/plant-products/journeys/linear/features/index.js'
import { entryGuardTarget } from './sets/plant-products/journeys/linear/flow/entry-guard.js'
import {
  FLOW_ONLY_KEYS,
  sections
} from './sets/plant-products/journeys/linear/flow/flow.js'
import { nextRunTarget } from './sets/plant-products/journeys/linear/flow/run.js'
import {
  rowStatus,
  taskRows
} from './sets/plant-products/journeys/linear/flow/task-rows.js'
import * as plantProductsObligationSet from './sets/plant-products/obligations/index.js'
import { records as recordsStub } from './sets/plant-products/services/records/stub.js'
import { session as sessionStub } from './services/persistence/session/stub.js'

const SET_ID = 'plant-products'

describe('plant-products indexed obligations are first-class', () => {
  beforeAll(() => {
    // The global setup mounts live-animals. Enter plant here so set-keyed reads
    // cannot silently resolve that setup fixture instead of this composed set.
    enterSetContext(SET_ID)
    configureObligationSet(SET_ID, plantProductsObligationSet)
    configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
    configureJourneyFlow(SET_ID, {
      sections,
      taskRows,
      rowStatus,
      nextRunTarget,
      flowOnlyKeys: FLOW_ONLY_KEYS,
      entryGuardTarget,
      layout: LAYOUT
    })
    buildDispatch(SET_ID, dispatchPages)
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub, SESSION_COOKIE_NAMES)
  })

  // Vitest may resume each test from its own async context.
  beforeEach(() => enterSetContext(SET_ID))

  // This suite has no URL-shaped values.
  it('Should enumerate every scalar plant-products obligation node', () => {
    expect([...walkObligations()]).toEqual([
      {
        obligation: plantProductsObligationSet.countryOfOrigin,
        templatePath: 'countryOfOrigin'
      },
      {
        obligation: plantProductsObligationSet.countryOfConsignment,
        templatePath: 'countryOfConsignment'
      },
      {
        obligation: plantProductsObligationSet.internalReference,
        templatePath: 'internalReference'
      },
      {
        obligation: plantProductsObligationSet.reasonForImport,
        templatePath: 'reasonForImport'
      },
      {
        obligation: plantProductsObligationSet.commodityInputMethod,
        templatePath: 'commodityInputMethod'
      },
      {
        obligation: plantProductsObligationSet.commodityLines,
        templatePath: 'commodityLines'
      },
      ...[
        'commoditySelection',
        'numberOfPackages',
        'packageType',
        'quantity',
        'quantityType',
        'netWeight',
        'controlledAtmosphereContainer',
        'finishedOrPropagated',
        'intendedForFinalUsers',
        'testAndTrial'
      ].map((name) => ({
        obligation: plantProductsObligationSet[name],
        templatePath: `commodityLines.${name}`
      })),
      {
        obligation: plantProductsObligationSet.species,
        templatePath: 'commodityLines.species'
      },
      ...['eppoCode', 'genusAndSpecies', 'speciesId'].map((name) => ({
        obligation: plantProductsObligationSet[name],
        templatePath: `commodityLines.species.${name}`
      })),
      {
        obligation: plantProductsObligationSet.varieties,
        templatePath: 'commodityLines.species.varieties'
      },
      ...['variety', 'varietyClass'].map((name) => ({
        obligation: plantProductsObligationSet[name],
        templatePath: `commodityLines.species.varieties.${name}`
      })),
      ...['totalGrossWeight', 'grossVolume', 'grossVolumeUnit'].map((name) => ({
        obligation: plantProductsObligationSet[name],
        templatePath: name
      })),
      {
        obligation: plantProductsObligationSet.accompanyingDocuments,
        templatePath: 'accompanyingDocuments'
      },
      ...['documentType', 'documentReference', 'issueDate'].map((name) => ({
        obligation: plantProductsObligationSet[name],
        templatePath: `accompanyingDocuments.${name}`
      })),
      {
        obligation: plantProductsObligationSet.borderControlPost,
        templatePath: 'borderControlPost'
      },
      {
        obligation: plantProductsObligationSet.inspectionPremises,
        templatePath: 'inspectionPremises'
      },
      {
        obligation: plantProductsObligationSet.meansOfTransport,
        templatePath: 'meansOfTransport'
      },
      {
        obligation: plantProductsObligationSet.transportIdentification,
        templatePath: 'transportIdentification'
      },
      {
        obligation: plantProductsObligationSet.transportDocumentReference,
        templatePath: 'transportDocumentReference'
      },
      {
        obligation: plantProductsObligationSet.arrivalDate,
        templatePath: 'arrivalDate'
      },
      {
        obligation: plantProductsObligationSet.arrivalTime,
        templatePath: 'arrivalTime'
      },
      {
        obligation: plantProductsObligationSet.usesContainers,
        templatePath: 'usesContainers'
      },
      {
        obligation: plantProductsObligationSet.containers,
        templatePath: 'containers'
      },
      {
        obligation: plantProductsObligationSet.containerNumber,
        templatePath: 'containers.containerNumber'
      },
      {
        obligation: plantProductsObligationSet.sealNumber,
        templatePath: 'containers.sealNumber'
      },
      {
        obligation: plantProductsObligationSet.officialSeal,
        templatePath: 'containers.officialSeal'
      },
      {
        obligation: plantProductsObligationSet.commonTransitConvention,
        templatePath: 'commonTransitConvention'
      },
      {
        obligation: plantProductsObligationSet.movementReferenceNumber,
        templatePath: 'movementReferenceNumber'
      },
      {
        obligation: plantProductsObligationSet.usingGvms,
        templatePath: 'usingGvms'
      }
    ])
  })

  it('Should place purpose after origin and before review', () => {
    expect(sections.map(({ id }) => id)).toEqual([
      'start',
      'origin',
      'purpose',
      'commodities',
      'additional-details',
      'transport',
      'goods-movement',
      'documents',
      'review'
    ])
  })

  it('Should place commodities after purpose and before transport', () => {
    const sectionIds = sections.map(({ id }) => id)

    expect(sectionIds.indexOf('purpose')).toBeLessThan(
      sectionIds.indexOf('commodities')
    )
    expect(sectionIds.indexOf('commodities')).toBeLessThan(
      sectionIds.indexOf('additional-details')
    )
    expect(sectionIds.indexOf('additional-details')).toBeLessThan(
      sectionIds.indexOf('transport')
    )
    expect(sectionIds.indexOf('transport')).toBeLessThan(
      sectionIds.indexOf('goods-movement')
    )
    expect(sectionIds.indexOf('goods-movement')).toBeLessThan(
      sectionIds.indexOf('documents')
    )
  })

  it('Should block readiness until mandatory origin and purpose rows are complete', () => {
    expect(
      readyForCheckYourAnswers({}, makeScope({}).inScope, evaluateAnswers({}))
    ).toBe(false)
    const originOnly = { countryOfOrigin: 'FR' }
    expect(
      readyForCheckYourAnswers(
        originOnly,
        makeScope(originOnly).inScope,
        evaluateAnswers(originOnly)
      )
    ).toBe(false)
    const originCompleted = {
      countryOfOrigin: 'FR',
      countryOfConsignment: 'IE'
    }
    expect(
      readyForCheckYourAnswers(
        originCompleted,
        makeScope(originCompleted).inScope,
        evaluateAnswers(originCompleted)
      )
    ).toBe(false)
    const completed = {
      ...originCompleted,
      reasonForImport: 'INTERNAL_MARKET'
    }
    expect(
      readyForCheckYourAnswers(
        completed,
        makeScope(completed).inScope,
        evaluateAnswers(completed)
      )
    ).toBe(false)
    const transportCompleted = {
      ...completed,
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
      usesContainers: false
    }
    expect(
      readyForCheckYourAnswers(
        transportCompleted,
        makeScope(transportCompleted).inScope,
        evaluateAnswers(transportCompleted)
      )
    ).toBe(false)
    const allCompleted = {
      ...transportCompleted,
      commonTransitConvention: 'NO',
      usingGvms: false,
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-001',
          issueDate: { day: '4', month: '12', year: '2025' }
        }
      ]
    }
    expect(
      readyForCheckYourAnswers(
        allCompleted,
        makeScope(allCompleted).inScope,
        evaluateAnswers(allCompleted)
      )
    ).toBe(true)
  })
})
