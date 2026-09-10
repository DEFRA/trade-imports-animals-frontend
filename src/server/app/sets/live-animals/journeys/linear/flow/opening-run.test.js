import { readFileSync } from 'node:fs'
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
import { documentsPage } from '../features/documents/page.js'
import { entryGuardTarget, guardedJourneyPath } from './entry-guard.js'

import * as origin from '../features/origin/controller.js'
import * as consignmentDetails from '../features/commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from '../features/commodities/animal-identification/animal-identification.controller.js'
import * as importReason from '../features/import-reason/controller.js'
import * as additionalDetails from '../features/additional-details/controller.js'
import * as cphNumber from '../features/cph-number/controller.js'
import * as transportersSelect from '../features/transport/transporters-select/transporters-select.controller.js'
import * as commercialTransporterDetails from '../features/transport/commercial-transporter-details/commercial-transporter-details.controller.js'
import * as privateTransporterDetails from '../features/transport/private-transporter-details/private-transporter-details.controller.js'
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

// A consignment of Atlantic salmon: Fish is on none of the identifier
// allowlists, so the identification page has nothing to ask of this line.
const fishLineSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [
    {
      commoditySelection: 'Fish',
      speciesSelection: '801204',
      numberOfAnimalsQuantity: '3',
      numberOfPackages: ''
    }
  ]
}

// A whole notification, so a step deep in the run has every earlier question
// answered and the next one admitted.
const { values: completeSeed } = JSON.parse(
  readFileSync(new URL('./fixtures/happy-path.json', import.meta.url))
)

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

  // Pins where the no-identifiers guard sends the request, not merely that it
  // redirects: mid-run it has to carry the person on to the next question,
  // which a bare hop to the hub would not do.
  it('Should carry a consignment with nothing to identify on to additional details mid-run', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, fishLineSeed)
    const h = captureH()
    const getHandler = animalIdentification.routes.find(
      (route) => route.method === 'GET'
    ).handler
    await getHandler(
      buildRequest(journey.journeyId, { record: active(journey.journeyId) }),
      h
    )
    expect(h.captured.redirect).toBe(
      pagePath(journey.journeyId, 'additional-details')
    )
    expect(h.captured.view).toBeUndefined()
  })

  it('Should send import reason to the first line identification mid-run', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, lineSeed)
    const h = captureH()
    await postHandlerOf(importReason)(
      buildRequest(journey.journeyId, {
        payload: {
          reasonForImport: 'internalMarket',
          purposeInInternalMarket: 'breeding'
        },
        record: active(journey.journeyId)
      }),
      h
    )
    expect(h.captured.redirect).toBe(
      pagePath(journey.journeyId, 'commodities/identification')
    )
  })

  it('Should carry additional details on to the arrival details mid-run rather than ending on the hub', async () => {
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
    expect(h.captured.redirect).toBe(
      pagePath(journey.journeyId, 'port-of-entry')
    )
  })

  // The add spokes are off the run, so the only thing that carries the trader
  // on is each spoke handing back at the list's step. A spoke that continued
  // from itself would find no step and drop them on the hub.
  const driveAddSpoke = async (featureModule, { seed, payload }) => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, { ...completeSeed, ...seed })
    const h = captureH()
    await postHandlerOf(featureModule)(
      buildRequest(journey.journeyId, {
        payload,
        record: active(journey.journeyId)
      }),
      h
    )
    return { journeyId: journey.journeyId, h }
  }

  it('Should carry a commercial register pick on to the documents mid-run, continuing from the list rather than the spoke', async () => {
    const { journeyId, h } = await driveAddSpoke(transportersSelect, {
      seed: { transporterType: 'Commercial' },
      payload: { commercialTransporter: 'garcia-livestock-transport' }
    })

    expect(h.captured.redirect).toBe(pagePath(journeyId, documentsPage.slug))
    expect(h.captured.redirect).not.toBe(hubPath(journeyId))
  })

  it('Should carry a hand-entered commercial transporter on to the documents mid-run, continuing from the list rather than the spoke', async () => {
    const { journeyId, h } = await driveAddSpoke(commercialTransporterDetails, {
      seed: { transporterType: 'Commercial' },
      payload: {
        approvalNumber: 'UK/BELF/T2/00104115',
        nameOrOrganisationName: 'Lough Neagh Livestock Ltd',
        addressLine1: '4 Quay Road',
        addressLine2: '',
        townOrCity: 'Belfast',
        county: 'County Antrim',
        postalOrZipCode: 'BT1 3LG',
        country: 'Northern Ireland',
        emailAddress: 'movements@lough-neagh.example.com',
        telephoneNumber: '+44 28 9000 0111'
      }
    })

    expect(h.captured.redirect).toBe(pagePath(journeyId, documentsPage.slug))
    expect(h.captured.redirect).not.toBe(hubPath(journeyId))
  })

  it('Should carry a private add-spoke save on to the documents mid-run, continuing from the list rather than the spoke', async () => {
    const { journeyId, h } = await driveAddSpoke(privateTransporterDetails, {
      seed: { transporterType: 'Private' },
      payload: {
        nameOrOrganisationName: 'Jean Dupont',
        addressLine1: '12 Rue des Fermes',
        addressLine2: '',
        townOrCity: 'Amiens',
        county: '',
        postalOrZipCode: '80000',
        country: 'France',
        telephoneNumber: '+33 3 22 55 01 44',
        emailAddress: 'jean.dupont@example.fr'
      }
    })

    expect(h.captured.redirect).toBe(pagePath(journeyId, documentsPage.slug))
    expect(h.captured.redirect).not.toBe(hubPath(journeyId))
  })

  it('Should carry a later section on to the next question too — the run is the whole notification, not its opening leg', async () => {
    const inRun = await store.create()
    await store.seedAnswers(inRun.journeyId, lineSeed)
    const h = captureH()
    await postHandlerOf(cphNumber)(
      buildRequest(inRun.journeyId, {
        payload: { cphCounty: '12', cphParish: '345', cphHolding: '6789' },
        record: active(inRun.journeyId)
      }),
      h
    )
    expect(h.captured.redirect).toBe(
      pagePath(inRun.journeyId, 'consignment/contact/select')
    )

    // Outside the run the page is the addresses section's last page, so the
    // section flow rests on the hub.
    const outside = await drive(postHandlerOf(cphNumber), {
      payload: { cphCounty: '12', cphParish: '345', cphHolding: '6789' },
      seed: lineSeed
    })
    expect(outside.h.captured.redirect).toBe(hubPath(outside.journeyId))
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

    it('Should honour Save and return to overview mid-run', async () => {
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
