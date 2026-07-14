import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { BASE, hubPath, pagePath, startPath } from '../config.js'
import { store } from '../engine/store.js'
import { configureRecords } from '../engine/persistence/records.js'
import {
  configureSession,
  JOURNEY_COOKIE,
  OPENING_RUN_COOKIE
} from '../engine/persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { postHandlerOf } from '../engine/test-support.js'
import { dispatchPages } from '../features/index.js'
import { buildDispatch } from './dispatch.js'
import { readyForCheckYourAnswers } from './section-status.js'
import { RUN_ACTIVE, RUN_COMPLETE } from './run-state.js'
import { entryGuardTarget, guardedJourneyPath } from './entry-guard.js'

import * as importTypeFilter from '../features/import-type-filter/controller.js'
import * as origin from '../features/origin/controller.js'
import * as consignmentDetails from '../features/commodities/consignment-details.controller.js'
import * as identifiersList from '../features/commodities/animal-identifiers.list.controller.js'
import * as importPurpose from '../features/import-purpose/controller.js'
import * as additionalDetails from '../features/additional-details/controller.js'
import * as hub from '../features/hub/controller.js'
import * as dashboard from '../features/dashboard/controller.js'

const captureH = () => {
  const captured = { cookies: {} }
  return {
    view: (view, context) => {
      captured.view = { view, context }
      return captured.view
    },
    redirect: (to) => {
      captured.redirect = to
      return { redirect: to }
    },
    state: (name, value) => {
      captured.cookies[name] = value
    },
    unstate: (name) => {
      delete captured.cookies[name]
    },
    captured
  }
}

const buildRequest = (journeyId, { record, ...overrides } = {}) => ({
  payload: {},
  params: {},
  query: {},
  headers: {},
  state: {
    ...(journeyId ? { [JOURNEY_COOKIE]: journeyId } : {}),
    ...(record ? { [OPENING_RUN_COOKIE]: record } : {})
  },
  ...overrides
})

const drive = async (handler, { seed = {}, ...overrides } = {}) => {
  const journey = await store.create()
  await store.saveAnswers(journey.journeyId, seed)
  const h = captureH()
  await handler(buildRequest(journey.journeyId, overrides), h)
  return { journeyId: journey.journeyId, h }
}

const active = (journeyId) => ({ journeyId, phase: RUN_ACTIVE })

const lineSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [
    {
      commoditySelection: 'Cat',
      speciesSelection: '923501',
      numberOfAnimalsQuantity: '',
      numberOfPackages: ''
    }
  ]
}

describe('the opening run', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  describe('the entry filter opens it', () => {
    const post = postHandlerOf(importTypeFilter)

    it('Should begin the run on a fresh journey and enter origin', async () => {
      const { journeyId, h } = await drive(post, {
        payload: { importType: 'live-animals' }
      })
      expect(h.captured.redirect).toBe(pagePath('origin'))
      expect(h.captured.cookies[OPENING_RUN_COOKIE]).toEqual(active(journeyId))
    })

    it('Should NOT begin the run for a journey with committed answers — the filter keeps its normal exit', async () => {
      const { h } = await drive(post, {
        payload: { importType: 'live-animals' },
        seed: { countryOfOrigin: 'FR' }
      })
      expect(h.captured.redirect).toBe(hubPath())
      expect(OPENING_RUN_COOKIE in h.captured.cookies).toBe(false)
    })

    it('Should still open the run when the only committed answer is an earlier filter answer (a corrected non-live-animals pick)', async () => {
      const { journeyId, h } = await drive(post, {
        payload: { importType: 'live-animals' },
        seed: { importType: 'poao' }
      })
      expect(h.captured.redirect).toBe(pagePath('origin'))
      expect(h.captured.cookies[OPENING_RUN_COOKIE]).toEqual(active(journeyId))
    })

    it('Should keep a run underway when the filter is re-submitted mid-run', async () => {
      const journey = await store.create()
      await store.saveAnswers(journey.journeyId, {
        importType: 'live-animals'
      })
      const h = captureH()
      await post(
        buildRequest(journey.journeyId, {
          payload: { importType: 'live-animals' },
          record: active(journey.journeyId)
        }),
        h
      )
      expect(h.captured.redirect).toBe(pagePath('origin'))
      expect(h.captured.cookies[OPENING_RUN_COOKIE]).toEqual(
        active(journey.journeyId)
      )
    })

    it('Should route a non-live-animals answer to the holding page with no run begun', async () => {
      const { h } = await drive(post, { payload: { importType: 'poao' } })
      expect(h.captured.redirect).toBe(pagePath('import-type/not-available'))
      expect(OPENING_RUN_COOKIE in h.captured.cookies).toBe(false)
    })
  })

  describe('save-and-continue follows the run sequence', () => {
    const originPost = postHandlerOf(origin)
    const originPayload = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no'
    }

    it('Should send origin to the commodity search mid-run', async () => {
      const { journeyId, h } = await drive(originPost, {
        payload: originPayload,
        record: undefined
      })
      expect(h.captured.redirect).toBe(hubPath())

      const again = await store.create()
      const h2 = captureH()
      await originPost(
        buildRequest(again.journeyId, {
          payload: originPayload,
          record: active(again.journeyId)
        }),
        h2
      )
      expect(h2.captured.redirect).toBe(pagePath('commodities'))
      expect(journeyId).not.toBe(again.journeyId)
    })

    it('Should send the consignment details page to import reason mid-run, and to the hub outside the run', async () => {
      const inRun = await store.create()
      await store.saveAnswers(inRun.journeyId, lineSeed)
      const h = captureH()
      await postHandlerOf(consignmentDetails)(
        buildRequest(inRun.journeyId, {
          payload: { 'numberOfAnimalsQuantity-0': '2' },
          record: active(inRun.journeyId)
        }),
        h
      )
      expect(h.captured.redirect).toBe(pagePath('import-reason'))

      // Outside the run the page is the commodities section's last page, so
      // the section flow rests on the hub.
      const outside = await drive(postHandlerOf(consignmentDetails), {
        payload: { 'numberOfAnimalsQuantity-0': '2' },
        seed: lineSeed
      })
      expect(outside.h.captured.redirect).toBe(hubPath())
    })

    it('Should pass a zero-record identification Continue through to additional details mid-run', async () => {
      const journey = await store.create()
      await store.saveAnswers(journey.journeyId, lineSeed)
      const h = captureH()
      await postHandlerOf(identifiersList)(
        buildRequest(journey.journeyId, {
          params: { index: '0' },
          record: active(journey.journeyId)
        }),
        h
      )
      expect(h.captured.redirect).toBe(pagePath('additional-details'))
    })

    it('Should send import purpose to the first line identification mid-run', async () => {
      const journey = await store.create()
      await store.saveAnswers(journey.journeyId, {
        ...lineSeed,
        reasonForImport: 'internalMarket'
      })
      const h = captureH()
      await postHandlerOf(importPurpose)(
        buildRequest(journey.journeyId, {
          payload: { purposeInInternalMarket: 'breeding' },
          record: active(journey.journeyId)
        }),
        h
      )
      expect(h.captured.redirect).toBe(pagePath('commodities/0/identifiers'))
    })

    it('Should land additional details on the hub — the run is exhausted', async () => {
      const journey = await store.create()
      await store.saveAnswers(journey.journeyId, lineSeed)
      const h = captureH()
      await postHandlerOf(additionalDetails)(
        buildRequest(journey.journeyId, {
          payload: { animalsCertifiedFor: 'slaughter' },
          record: active(journey.journeyId)
        }),
        h
      )
      expect(h.captured.redirect).toBe(hubPath())
    })
  })

  describe('explicit exits beat the run', () => {
    const originPost = postHandlerOf(origin)

    it('Should honour Save and return to hub mid-run', async () => {
      const journey = await store.create()
      const h = captureH()
      await originPost(
        buildRequest(journey.journeyId, {
          payload: {
            countryOfOrigin: 'FR',
            regionOfOriginCodeRequirement: 'no',
            exit: 'hub'
          },
          record: active(journey.journeyId)
        }),
        h
      )
      expect(h.captured.redirect).toBe(hubPath())
    })

    it('Should honour the change context over the run target', async () => {
      const journey = await store.create()
      const h = captureH()
      await originPost(
        buildRequest(journey.journeyId, {
          payload: {
            countryOfOrigin: 'FR',
            regionOfOriginCodeRequirement: 'no'
          },
          query: { change: '1' },
          record: active(journey.journeyId)
        }),
        h
      )
      expect(h.captured.redirect).toBe(pagePath('notification-view'))
    })
  })

  describe('reaching the hub ends the run', () => {
    const hubGet = hub.routes[0].handler

    it('Should flip the record to complete on hub arrival', async () => {
      const journey = await store.create()
      const h = captureH()
      await hubGet(
        buildRequest(journey.journeyId, {
          record: active(journey.journeyId)
        }),
        h
      )
      expect(h.captured.cookies[OPENING_RUN_COOKIE]).toEqual({
        journeyId: journey.journeyId,
        phase: RUN_COMPLETE
      })
    })

    it('Should leave a completed record alone on later hub visits', async () => {
      const journey = await store.create()
      const h = captureH()
      await hubGet(
        buildRequest(journey.journeyId, {
          record: { journeyId: journey.journeyId, phase: RUN_COMPLETE }
        }),
        h
      )
      expect(OPENING_RUN_COOKIE in h.captured.cookies).toBe(false)
    })

    it('Should fall back to the section flow once the run is complete (change=1 and plain saves unaffected)', async () => {
      const journey = await store.create()
      const h = captureH()
      await postHandlerOf(origin)(
        buildRequest(journey.journeyId, {
          payload: {
            countryOfOrigin: 'FR',
            regionOfOriginCodeRequirement: 'no'
          },
          record: { journeyId: journey.journeyId, phase: RUN_COMPLETE }
        }),
        h
      )
      expect(h.captured.redirect).toBe(hubPath())
    })
  })

  describe('the run is scoped to its journey', () => {
    it('Should ignore an active record that belongs to a different journey', async () => {
      const journey = await store.create()
      const h = captureH()
      await postHandlerOf(origin)(
        buildRequest(journey.journeyId, {
          payload: {
            countryOfOrigin: 'FR',
            regionOfOriginCodeRequirement: 'no'
          },
          record: active('some-other-journey')
        }),
        h
      )
      expect(h.captured.redirect).toBe(hubPath())
    })
  })

  describe('journey entry', () => {
    it('Should send Start a new notification to the entry filter', async () => {
      const startPost = dashboard.routes.find(
        (route) => route.method === 'POST' && route.path === startPath()
      ).handler
      const h = captureH()
      await startPost(buildRequest(undefined), h)
      expect(h.captured.redirect).toBe(pagePath('import-type'))
    })
  })

  describe('deep-link guard', () => {
    it('Should exempt the dashboard, the filter, the holding page and start', () => {
      expect(guardedJourneyPath(BASE)).toBe(false)
      expect(guardedJourneyPath(pagePath('home'))).toBe(false)
      expect(guardedJourneyPath(pagePath('home/j-1/resume'))).toBe(false)
      expect(guardedJourneyPath(pagePath('import-type'))).toBe(false)
      expect(guardedJourneyPath(pagePath('import-type/not-available'))).toBe(
        false
      )
      expect(guardedJourneyPath(startPath())).toBe(false)
      expect(guardedJourneyPath('/some-other-prototype/origin')).toBe(false)
    })

    it('Should guard every post-filter journey page', () => {
      expect(guardedJourneyPath(hubPath())).toBe(true)
      expect(guardedJourneyPath(pagePath('origin'))).toBe(true)
      expect(guardedJourneyPath(pagePath('consignment-details'))).toBe(true)
      expect(guardedJourneyPath(pagePath('notification-view'))).toBe(true)
    })

    it('Should redirect a fresh journey to the filter', async () => {
      const journey = await store.create()
      const target = await entryGuardTarget(
        buildRequest(journey.journeyId, { path: pagePath('origin') }),
        captureH()
      )
      expect(target).toBe(pagePath('import-type'))
    })

    it('Should let a journey with a committed answer straight through', async () => {
      const journey = await store.create()
      await store.saveAnswers(journey.journeyId, { countryOfOrigin: 'FR' })
      const target = await entryGuardTarget(
        buildRequest(journey.journeyId, { path: pagePath('origin') }),
        captureH()
      )
      expect(target).toBe(null)
    })

    it('Should treat an importType-only journey that never entered through the filter as fresh', async () => {
      const journey = await store.create()
      await store.saveAnswers(journey.journeyId, { importType: 'poao' })
      const target = await entryGuardTarget(
        buildRequest(journey.journeyId, { path: pagePath('origin') }),
        captureH()
      )
      expect(target).toBe(pagePath('import-type'))
    })

    it('Should let a journey that entered through the filter straight through — any phase', async () => {
      const journey = await store.create()
      for (const phase of [RUN_ACTIVE, RUN_COMPLETE]) {
        const target = await entryGuardTarget(
          buildRequest(journey.journeyId, {
            path: pagePath('origin'),
            record: { journeyId: journey.journeyId, phase }
          }),
          captureH()
        )
        expect(target).toBe(null)
      }
    })

    it('Should not let another journey filter pass vouch for a fresh journey', async () => {
      const journey = await store.create()
      const target = await entryGuardTarget(
        buildRequest(journey.journeyId, {
          path: pagePath('origin'),
          record: active('some-other-journey')
        }),
        captureH()
      )
      expect(target).toBe(pagePath('import-type'))
    })

    it('Should never consult the journey for an exempt path', async () => {
      const target = await entryGuardTarget(
        buildRequest(undefined, { path: pagePath('import-type') }),
        captureH()
      )
      expect(target).toBe(null)
    })
  })
})
