import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  BASE,
  createPath,
  hubPath,
  pagePath
} from '../../../../../shared/paths.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import {
  configureSession,
  SESSION_COOKIES
} from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import { postHandlerOf } from '../../../../../engine/test-support.js'
import { dispatchPages } from '../features/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { RUN_ACTIVE, RUN_COMPLETE } from '../../../../../flow/run-state.js'
import { entryGuardTarget, guardedJourneyPath } from './entry-guard.js'

import * as origin from '../features/origin/controller.js'
import * as consignmentDetails from '../features/commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from '../features/commodities/animal-identification/animal-identification.controller.js'
import * as importPurpose from '../features/import-purpose/controller.js'
import * as additionalDetails from '../features/additional-details/controller.js'
import * as hub from '../features/hub/controller.js'
import * as dashboard from '../features/dashboard/controller.js'

const ORIGIN_SLUG = 'origin'

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
  params: journeyId ? { journeyId } : {},
  query: {},
  headers: {},
  state: {
    ...(journeyId ? { [SESSION_COOKIES.knownJourneys]: [journeyId] } : {}),
    ...(record ? { [SESSION_COOKIES.openingRun]: record } : {})
  },
  ...overrides
})

const drive = async (handler, { seed = {}, ...overrides } = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  const h = captureH()
  await handler(buildRequest(journey.journeyId, overrides), h)
  return { journeyId: journey.journeyId, h }
}

const active = (journeyId) => ({ [journeyId]: RUN_ACTIVE })

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

const startPostHandler = () =>
  dashboard.routes.find(
    (route) => route.method === 'POST' && route.path === createPath()
  ).handler

const originPayload = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no'
}

const createNotification = async (overrides) => {
  const h = captureH()
  await startPostHandler()(buildRequest(undefined, overrides), h)
  return {
    journeyId: h.captured.cookies[SESSION_COOKIES.knownJourneys][0],
    record: h.captured.cookies[SESSION_COOKIES.openingRun],
    h
  }
}

const creatingANotificationOpensTheRun = () => {
  it('Should land Start a new notification on origin with the run already begun', async () => {
    const { journeyId, h } = await createNotification()
    expect(h.captured.redirect).toBe(pagePath(journeyId, ORIGIN_SLUG))
    expect(h.captured.cookies[SESSION_COOKIES.openingRun]).toEqual(
      active(journeyId)
    )
  })

  it('Should sequence a created notification on from origin to the commodities page rather than the hub', async () => {
    const { journeyId, record } = await createNotification()
    const h = captureH()
    await postHandlerOf(origin)(
      buildRequest(journeyId, { payload: originPayload, record }),
      h
    )
    expect(h.captured.redirect).toBe(pagePath(journeyId, 'commodities'))
  })

  it('Should send a journey with no run record to the hub after origin, not into the opening run — origin is an ordinary page now', async () => {
    const { journeyId, h } = await drive(postHandlerOf(origin), {
      payload: originPayload
    })
    expect(h.captured.redirect).toBe(hubPath(journeyId))
    expect(SESSION_COOKIES.openingRun in h.captured.cookies).toBe(false)
  })
}

const saveAndContinueFollowsTheRunSequence = () => {
  const originPost = postHandlerOf(origin)

  it('Should send origin to the commodity search mid-run', async () => {
    const journey = await store.create()
    const h = captureH()
    await originPost(
      buildRequest(journey.journeyId, {
        payload: originPayload,
        record: active(journey.journeyId)
      }),
      h
    )
    expect(h.captured.redirect).toBe(pagePath(journey.journeyId, 'commodities'))
  })

  it('Should send the consignment details page to import reason mid-run, and to the hub outside the run', async () => {
    const inRun = await store.create()
    await store.seedAnswers(inRun.journeyId, lineSeed)
    const h = captureH()
    await postHandlerOf(consignmentDetails)(
      buildRequest(inRun.journeyId, {
        payload: { 'numberOfAnimalsQuantity-0': '2' },
        record: active(inRun.journeyId)
      }),
      h
    )
    expect(h.captured.redirect).toBe(pagePath(inRun.journeyId, 'import-reason'))

    // Outside the run the page is the commodities section's last page, so
    // the section flow rests on the hub.
    const outside = await drive(postHandlerOf(consignmentDetails), {
      payload: { 'numberOfAnimalsQuantity-0': '2' },
      seed: lineSeed
    })
    expect(outside.h.captured.redirect).toBe(hubPath(outside.journeyId))
  })

  it('Should pass a zero-record identification Save-and-finish through to additional details mid-run', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, lineSeed)
    const h = captureH()
    await postHandlerOf(animalIdentification)(
      buildRequest(journey.journeyId, {
        payload: { action: 'finish' },
        record: active(journey.journeyId)
      }),
      h
    )
    expect(h.captured.redirect).toBe(
      pagePath(journey.journeyId, 'additional-details')
    )
  })

  it('Should send import purpose to the first line identification mid-run', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
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
    expect(h.captured.redirect).toBe(
      pagePath(journey.journeyId, 'commodities/identification')
    )
  })

  it('Should land additional details on the hub — the run is exhausted', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, lineSeed)
    const h = captureH()
    await postHandlerOf(additionalDetails)(
      buildRequest(journey.journeyId, {
        payload: { animalsCertifiedFor: 'slaughter' },
        record: active(journey.journeyId)
      }),
      h
    )
    expect(h.captured.redirect).toBe(hubPath(journey.journeyId))
  })
}

const deepLinkGuardTests = () => {
  it('Should exempt the dashboard, the entry page and its children, and start', () => {
    expect(guardedJourneyPath(BASE)).toBe(false)
    expect(guardedJourneyPath('/')).toBe(false)
    expect(guardedJourneyPath(pagePath('j-1', ORIGIN_SLUG))).toBe(false)
    expect(guardedJourneyPath(pagePath('j-1', 'origin/anything'))).toBe(false)
    expect(guardedJourneyPath(createPath())).toBe(false)
    expect(guardedJourneyPath('/some-other-prototype/origin')).toBe(false)
  })

  it('Should guard every journey page beyond the entry page', () => {
    expect(guardedJourneyPath(hubPath('j-1'))).toBe(true)
    expect(guardedJourneyPath(pagePath('j-1', 'commodities'))).toBe(true)
    expect(guardedJourneyPath(pagePath('j-1', 'consignment-details'))).toBe(
      true
    )
    expect(guardedJourneyPath(pagePath('j-1', 'notification-view'))).toBe(true)
  })

  it('Should redirect a journey with neither a run record nor answers to the entry page', async () => {
    const journey = await store.create()
    const target = await entryGuardTarget(
      buildRequest(journey.journeyId, { path: hubPath(journey.journeyId) }),
      captureH()
    )
    expect(target).toBe(pagePath(journey.journeyId, ORIGIN_SLUG))
  })

  it('Should admit a notification created in this session before any page is answered', async () => {
    const { journeyId, record } = await createNotification()
    const target = await entryGuardTarget(
      buildRequest(journeyId, { path: hubPath(journeyId), record }),
      captureH()
    )
    expect(target).toBeNull()
  })

  it('Should let a journey with a committed answer straight through', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, { countryOfOrigin: 'FR' })
    const target = await entryGuardTarget(
      buildRequest(journey.journeyId, { path: hubPath(journey.journeyId) }),
      captureH()
    )
    expect(target).toBeNull()
  })

  it('Should treat a journey whose only answer is a flow-only key as fresh', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, { declaration: 'confirmed' })
    const target = await entryGuardTarget(
      buildRequest(journey.journeyId, { path: hubPath(journey.journeyId) }),
      captureH()
    )
    expect(target).toBe(pagePath(journey.journeyId, ORIGIN_SLUG))
  })

  it('Should let a journey that entered through the journey entry straight through — any phase', async () => {
    const journey = await store.create()
    for (const phase of [RUN_ACTIVE, RUN_COMPLETE]) {
      const target = await entryGuardTarget(
        buildRequest(journey.journeyId, {
          path: hubPath(journey.journeyId),
          record: { [journey.journeyId]: phase }
        }),
        captureH()
      )
      expect(target).toBeNull()
    }
  })

  it('Should not let another journey entry vouch for a fresh journey', async () => {
    const journey = await store.create()
    const target = await entryGuardTarget(
      buildRequest(journey.journeyId, {
        path: hubPath(journey.journeyId),
        record: active('some-other-journey')
      }),
      captureH()
    )
    expect(target).toBe(pagePath(journey.journeyId, ORIGIN_SLUG))
  })

  it('Should never consult the journey for an exempt path', async () => {
    const target = await entryGuardTarget(
      buildRequest(undefined, { path: createPath() }),
      captureH()
    )
    expect(target).toBeNull()
  })
}

describe('the opening run', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  describe('creating a notification opens it', creatingANotificationOpensTheRun)

  describe(
    'save-and-continue follows the run sequence',
    saveAndContinueFollowsTheRunSequence
  )

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
      expect(h.captured.redirect).toBe(hubPath(journey.journeyId))
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
      expect(h.captured.redirect).toBe(
        pagePath(journey.journeyId, 'notification-view')
      )
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
      expect(h.captured.cookies[SESSION_COOKIES.openingRun]).toEqual({
        [journey.journeyId]: RUN_COMPLETE
      })
    })

    it('Should leave a completed record alone on later hub visits', async () => {
      const journey = await store.create()
      const h = captureH()
      await hubGet(
        buildRequest(journey.journeyId, {
          record: { [journey.journeyId]: RUN_COMPLETE }
        }),
        h
      )
      expect(SESSION_COOKIES.openingRun in h.captured.cookies).toBe(false)
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
          record: { [journey.journeyId]: RUN_COMPLETE }
        }),
        h
      )
      expect(h.captured.redirect).toBe(hubPath(journey.journeyId))
      expect(SESSION_COOKIES.openingRun in h.captured.cookies).toBe(false)
    })
  })

  describe('the run is scoped to its journey', () => {
    it('Should open its own run alongside a record belonging to a different journey', async () => {
      const { journeyId, h } = await createNotification({
        record: active('some-other-journey')
      })
      expect(h.captured.cookies[SESSION_COOKIES.openingRun]).toEqual({
        'some-other-journey': RUN_ACTIVE,
        [journeyId]: RUN_ACTIVE
      })
    })
  })

  describe('deep-link guard', deepLinkGuardTests)
})
