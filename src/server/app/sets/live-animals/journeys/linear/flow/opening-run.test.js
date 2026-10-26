import { SET_ID } from '../../../set.js'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  dashboardPath,
  createPath,
  createRoutePath,
  hubPath,
  pagePath
} from '../../../../../shared/paths.js'
import {
  knownJourneysCookie,
  openingRunCookie
} from '../../../../../engine/persistence/session.js'
import {
  driveHandler,
  expectOneLogged,
  getHandlerOf,
  journeyRequest,
  postHandlerOf,
  stubH,
  useStubbedJourney
} from '../../../../../engine/test-support.js'
import {
  typedInCommercialTransporterPayload,
  typedInPrivateTransporterPayload
} from '../features/transport/test-support.js'
import { lineKey } from '../features/commodities/search/selection/line-key.js'
import { SHOWN_SEARCH_ROWS } from '../features/commodities/search/selection/rows.js'
import {
  FELIS_CATUS_ROW,
  STRUTHIO_ROW,
  lineOf
} from '../features/commodities/search/test-support.js'
import { STUB_BOOK } from '../../../../../services/address-book/stub/index.js'
import { dispatchPages } from '../features/index.js'
import { RUN_ACTIVE, RUN_COMPLETE } from '../../../../../flow/run-state.js'
import { documentsPage } from '../features/documents/page.js'
import { entryGuardTarget, guardedJourneyPath } from './entry-guard.js'

import * as origin from '../features/origin/controller.js'
import * as consignmentDetails from '../features/commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from '../features/commodities/animal-identification/animal-identification.controller.js'
import * as importReason from '../features/import-reason/controller.js'
import * as additionalDetails from '../features/additional-details/controller.js'
import * as commoditiesSearch from '../features/commodities/search/search.controller.js'
import * as portOfEntry from '../features/transport/port-of-entry/port-of-entry.controller.js'
import * as addresses from '../features/addresses/controller.js'
import * as contact from '../features/contact/controller.js'
import * as checkAnswers from '../features/check-answers/controller.js'
import * as cphNumber from '../features/cph-number/controller.js'
import * as transportersSelect from '../features/transport/transporters-select/transporters-select.controller.js'
import * as commercialTransporterDetails from '../features/transport/commercial-transporter-details/commercial-transporter-details.controller.js'
import * as privateTransporterDetails from '../features/transport/private-transporter-details/private-transporter-details.controller.js'
import * as hub from '../features/hub/controller.js'
import * as dashboard from '../features/dashboard/controller.js'

const ORIGIN_SLUG = 'origin'
const CONSIGNMENT_DETAILS_SLUG = 'consignment-details'
const NOTIFICATION_VIEW_SLUG = 'notification-view'

const CONTACT = STUB_BOOK.find(
  (record) => record.name === 'Animal and Plant Health Agency'
)

const runRecord = (journeyId, phase = RUN_ACTIVE) => ({
  [openingRunCookie()]: { [journeyId]: phase }
})

const lineSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [lineOf(FELIS_CATUS_ROW)]
}

const unidentifiedLineSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [lineOf(STRUTHIO_ROW, { numberOfAnimalsQuantity: '3' })]
}

const { values: completeSeed } = JSON.parse(
  readFileSync(new URL('./fixtures/happy-path.json', import.meta.url))
)

const postBreedingInternalMarketReason = (openingRun) =>
  driveHandler(postHandlerOf(importReason), {
    seed: lineSeed,
    payload: {
      reasonForImport: 'internalMarket',
      purposeInInternalMarket: 'breeding'
    },
    openingRun
  })

const startPostHandler = () =>
  dashboard.routes.find(
    (route) => route.method === 'POST' && route.path === createRoutePath()
  ).handler

const originPayload = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no'
}

const createNotification = async (state = {}) => {
  const request = journeyRequest(undefined, { state })
  const h = stubH(request)
  const response = await startPostHandler()(request, h)
  return {
    journeyId: h.cookies[knownJourneysCookie()][0],
    record: h.cookies[openingRunCookie()],
    cookies: h.cookies,
    response
  }
}

const creatingANotificationOpensTheRun = () => {
  it('Should land Start a new notification on origin with the run already begun', async () => {
    const { journeyId, response, cookies } = await createNotification()
    expect(response.redirect).toBe(pagePath(journeyId, ORIGIN_SLUG))
    expect(cookies[openingRunCookie()]).toEqual({ [journeyId]: RUN_ACTIVE })
  })

  it('Should sequence a created notification on from origin to the commodities page rather than the hub', async () => {
    const { journeyId, record } = await createNotification()
    const request = journeyRequest(journeyId, {
      payload: originPayload,
      state: { [openingRunCookie()]: record }
    })
    const response = await postHandlerOf(origin)(request, stubH(request))
    expect(response.redirect).toBe(pagePath(journeyId, 'commodities'))
  })

  it('Should send a journey with no run record to the hub after origin, not into the opening run', async () => {
    const { journeyId, response, cookies } = await driveHandler(
      postHandlerOf(origin),
      { payload: originPayload }
    )
    expect(response.redirect).toBe(hubPath(journeyId))
    expect(openingRunCookie() in cookies).toBe(false)
  })
}

const saveAndContinueFollowsTheRunSequence = () => {
  const originPost = postHandlerOf(origin)

  it('Should send origin to the commodity search mid-run', async () => {
    const { journeyId, response } = await driveHandler(originPost, {
      payload: originPayload,
      openingRun: RUN_ACTIVE
    })
    expect(response.redirect).toBe(pagePath(journeyId, 'commodities'))
  })

  it('Should send What are you importing? on to the main import reason mid-run, and to the overview outside the run', async () => {
    const payload = { species: [lineKey(FELIS_CATUS_ROW)] }
    const seed = { countryOfOrigin: 'FR' }
    const flowOnly = { [SHOWN_SEARCH_ROWS]: [FELIS_CATUS_ROW] }
    const inRun = await driveHandler(postHandlerOf(commoditiesSearch), {
      payload,
      seed,
      flowOnly,
      openingRun: RUN_ACTIVE
    })
    expect(inRun.response.redirect).toBe(
      pagePath(inRun.journeyId, 'import-reason')
    )

    const outside = await driveHandler(postHandlerOf(commoditiesSearch), {
      payload,
      seed,
      flowOnly
    })
    expect(outside.response.redirect).toBe(hubPath(outside.journeyId))
  })

  it('Should send the consignment details page to the identification surface mid-run, and to the hub outside the run', async () => {
    const payload = { 'numberOfAnimalsQuantity-0': '2' }
    const inRun = await driveHandler(postHandlerOf(consignmentDetails), {
      payload,
      seed: lineSeed,
      openingRun: RUN_ACTIVE
    })
    expect(inRun.response.redirect).toBe(
      pagePath(inRun.journeyId, 'commodities/identification')
    )

    const outside = await driveHandler(postHandlerOf(consignmentDetails), {
      payload,
      seed: lineSeed
    })
    expect(outside.response.redirect).toBe(hubPath(outside.journeyId))
  })

  it('Should pass a zero-record identification Save-and-finish through to additional details mid-run', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(animalIdentification),
      { payload: { action: 'finish' }, seed: lineSeed, openingRun: RUN_ACTIVE }
    )
    expect(response.redirect).toBe(pagePath(journeyId, 'additional-details'))
  })

  it('Should log the skip and carry a consignment with nothing to identify on to additional details mid-run', async () => {
    const { journeyId, response, view, logger } = await driveHandler(
      getHandlerOf(animalIdentification),
      { seed: unidentifiedLineSeed, openingRun: RUN_ACTIVE }
    )
    expect(response.redirect).toBe(pagePath(journeyId, 'additional-details'))
    expect(view).toBeUndefined()
    expectOneLogged(logger, {
      level: 'info',
      fields: { journeyId, commodityCodes: ['01063300'] },
      message:
        'Animal identification skipped: nothing on the consignment carries an identifier'
    })
  })

  it('Should send import reason on to the consignment details mid-run', async () => {
    const { journeyId, response } =
      await postBreedingInternalMarketReason(RUN_ACTIVE)
    expect(response.redirect).toBe(
      pagePath(journeyId, CONSIGNMENT_DETAILS_SLUG)
    )
  })

  it('Should carry additional details on to the arrival details mid-run rather than ending on the hub', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(additionalDetails),
      {
        payload: { animalsCertifiedFor: 'slaughter' },
        seed: lineSeed,
        openingRun: RUN_ACTIVE
      }
    )
    expect(response.redirect).toBe(pagePath(journeyId, 'port-of-entry'))
  })

  const driveAddSpoke = (featureModule, { seed, payload }) =>
    driveHandler(postHandlerOf(featureModule), {
      seed: { ...completeSeed, ...seed },
      payload,
      openingRun: RUN_ACTIVE
    })

  it('Should carry a commercial register pick on to the documents mid-run, continuing from the list rather than the spoke', async () => {
    const { journeyId, response } = await driveAddSpoke(transportersSelect, {
      seed: { transporterType: 'Commercial' },
      payload: { commercialTransporter: 'garcia-livestock-transport' }
    })

    expect(response.redirect).toBe(pagePath(journeyId, documentsPage.slug))
    expect(response.redirect).not.toBe(hubPath(journeyId))
  })

  it('Should carry a hand-entered commercial transporter on to the documents mid-run, continuing from the list rather than the spoke', async () => {
    const { journeyId, response } = await driveAddSpoke(
      commercialTransporterDetails,
      {
        seed: { transporterType: 'Commercial' },
        payload: typedInCommercialTransporterPayload
      }
    )

    expect(response.redirect).toBe(pagePath(journeyId, documentsPage.slug))
    expect(response.redirect).not.toBe(hubPath(journeyId))
  })

  it('Should carry a private add-spoke save on to the documents mid-run, continuing from the list rather than the spoke', async () => {
    const { journeyId, response } = await driveAddSpoke(
      privateTransporterDetails,
      {
        seed: { transporterType: 'Private' },
        payload: typedInPrivateTransporterPayload
      }
    )

    expect(response.redirect).toBe(pagePath(journeyId, documentsPage.slug))
    expect(response.redirect).not.toBe(hubPath(journeyId))
  })
}

const endOfTheRunFollowsTheRunSequence = () => {
  it('Should carry roles and addresses on to the contact address mid-run', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(addresses),
      { seed: lineSeed, openingRun: RUN_ACTIVE }
    )
    expect(response.redirect).toBe(
      pagePath(journeyId, 'consignment/contact/select')
    )
  })

  it('Should send roles and addresses to the overview mid-run once every task is complete', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(addresses),
      { seed: completeSeed, openingRun: RUN_ACTIVE }
    )
    expect(response.redirect).toBe(hubPath(journeyId))
  })

  it('Should hand the CPH number back to the roles and addresses, mid-run and outside it', async () => {
    const payload = { cphCounty: '12', cphParish: '345', cphHolding: '6789' }
    const inRun = await driveHandler(postHandlerOf(cphNumber), {
      payload,
      seed: lineSeed,
      openingRun: RUN_ACTIVE
    })
    expect(inRun.response.redirect).toBe(pagePath(inRun.journeyId, 'addresses'))

    const outside = await driveHandler(postHandlerOf(cphNumber), {
      payload,
      seed: lineSeed
    })
    expect(outside.response.redirect).toBe(
      pagePath(outside.journeyId, 'addresses')
    )
  })

  it('Should end the run on the review page from the contact address mid-run, even with tasks outstanding', async () => {
    const { journeyId, response } = await driveHandler(postHandlerOf(contact), {
      payload: { contactAddress: CONTACT.id },
      seed: lineSeed,
      openingRun: RUN_ACTIVE
    })
    expect(response.redirect).toBe(pagePath(journeyId, NOTIFICATION_VIEW_SLUG))
  })
}

const deepLinkGuardTests = () => {
  const guardFor = (options) =>
    driveHandler(entryGuardTarget, { pathOf: hubPath, ...options })

  it('Should exempt the dashboard, the entry page and its children, and start', () => {
    expect(guardedJourneyPath(dashboardPath())).toBe(false)
    expect(guardedJourneyPath('/')).toBe(false)
    expect(guardedJourneyPath(pagePath('j-1', ORIGIN_SLUG))).toBe(false)
    expect(guardedJourneyPath(pagePath('j-1', 'origin/anything'))).toBe(false)
    expect(guardedJourneyPath(createPath())).toBe(false)
    expect(guardedJourneyPath('/some-other-prototype/origin')).toBe(false)
  })

  it('Should guard every journey page beyond the entry page', () => {
    expect(guardedJourneyPath(hubPath('j-1'))).toBe(true)
    expect(guardedJourneyPath(pagePath('j-1', 'commodities'))).toBe(true)
    expect(guardedJourneyPath(pagePath('j-1', CONSIGNMENT_DETAILS_SLUG))).toBe(
      true
    )
    expect(guardedJourneyPath(pagePath('j-1', NOTIFICATION_VIEW_SLUG))).toBe(
      true
    )
  })

  it('Should redirect a journey with neither a run record nor answers to the entry page', async () => {
    const { journeyId, response } = await guardFor()
    expect(response).toBe(pagePath(journeyId, ORIGIN_SLUG))
  })

  it('Should admit a notification created in this session before any page is answered', async () => {
    const { journeyId, record } = await createNotification()
    const request = journeyRequest(journeyId, {
      path: hubPath(journeyId),
      state: { [openingRunCookie()]: record }
    })
    expect(await entryGuardTarget(request, stubH(request))).toBeNull()
  })

  it('Should let a journey with a committed answer straight through', async () => {
    const { response } = await guardFor({ seed: { countryOfOrigin: 'FR' } })
    expect(response).toBeNull()
  })

  it('Should treat a journey whose only answer is a flow-only key as fresh', async () => {
    const { journeyId, response } = await guardFor({
      seed: { declaration: 'confirmed' }
    })
    expect(response).toBe(pagePath(journeyId, ORIGIN_SLUG))
  })

  it.each([RUN_ACTIVE, RUN_COMPLETE])(
    'Should let a journey that entered through the journey entry straight through while the run is %s',
    async (openingRun) => {
      const { response } = await guardFor({ openingRun })
      expect(response).toBeNull()
    }
  )

  it('Should not let another journey entry vouch for a fresh journey', async () => {
    const { journeyId, response } = await guardFor({
      state: runRecord('some-other-journey')
    })
    expect(response).toBe(pagePath(journeyId, ORIGIN_SLUG))
  })

  it('Should never consult the journey for an exempt path', async () => {
    const request = journeyRequest(undefined, { path: createPath() })
    expect(await entryGuardTarget(request, stubH(request))).toBeNull()
  })
}

describe('the opening run', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  describe('creating a notification opens it', creatingANotificationOpensTheRun)

  describe(
    'save-and-continue follows the run sequence',
    saveAndContinueFollowsTheRunSequence
  )

  describe(
    'the end of the run follows the run sequence',
    endOfTheRunFollowsTheRunSequence
  )

  describe('explicit exits beat the run', () => {
    const originPost = postHandlerOf(origin)

    it('Should honour Save and return to overview mid-run', async () => {
      const { journeyId, response } = await driveHandler(originPost, {
        payload: { ...originPayload, exit: 'hub' },
        openingRun: RUN_ACTIVE
      })
      expect(response.redirect).toBe(hubPath(journeyId))
    })

    it('Should honour the change context over the run target', async () => {
      const { journeyId, response } = await driveHandler(originPost, {
        payload: originPayload,
        query: { change: '1' },
        openingRun: RUN_ACTIVE
      })
      expect(response.redirect).toBe(
        pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
      )
    })
  })

  describe('reaching the hub ends the run', () => {
    const hubGet = hub.routes[0].handler

    it('Should flip the record to complete on hub arrival', async () => {
      const { journeyId, cookies } = await driveHandler(hubGet, {
        openingRun: RUN_ACTIVE
      })
      expect(cookies[openingRunCookie()]).toEqual({
        [journeyId]: RUN_COMPLETE
      })
    })

    it('Should leave a completed record alone on later hub visits', async () => {
      const { cookies } = await driveHandler(hubGet, {
        openingRun: RUN_COMPLETE
      })
      expect(openingRunCookie() in cookies).toBe(false)
    })

    it('Should send origin to the overview and write no run record once the run is complete', async () => {
      const { journeyId, response, cookies } = await driveHandler(
        postHandlerOf(origin),
        { payload: originPayload, openingRun: RUN_COMPLETE }
      )
      expect(response.redirect).toBe(hubPath(journeyId))
      expect(openingRunCookie() in cookies).toBe(false)
    })

    it('Should send a change=1 origin save to check your answers once the run is complete', async () => {
      const { journeyId, response, cookies } = await driveHandler(
        postHandlerOf(origin),
        {
          payload: originPayload,
          query: { change: '1' },
          openingRun: RUN_COMPLETE
        }
      )
      expect(response.redirect).toBe(
        pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
      )
      expect(openingRunCookie() in cookies).toBe(false)
    })
  })

  describe('a page opened from its overview task returns to the overview', () => {
    it('Should send the main import reason to the overview, not on to the additional details', async () => {
      const { journeyId, response } =
        await postBreedingInternalMarketReason(RUN_COMPLETE)
      expect(response.redirect).toBe(hubPath(journeyId))
    })

    it('Should send additional details to the overview, not on to the arrival details', async () => {
      const { journeyId, response } = await driveHandler(
        postHandlerOf(additionalDetails),
        {
          payload: { animalsCertifiedFor: 'slaughter' },
          seed: lineSeed,
          openingRun: RUN_COMPLETE
        }
      )
      expect(response.redirect).toBe(hubPath(journeyId))
    })

    it('Should send the arrival details on to the transit countries mid-run, and to the overview outside the run', async () => {
      const payload = { meansOfTransport: 'ROAD_VEHICLE' }
      const inRun = await driveHandler(postHandlerOf(portOfEntry), {
        payload,
        seed: completeSeed,
        openingRun: RUN_ACTIVE
      })
      expect(inRun.response.redirect).toBe(
        pagePath(inRun.journeyId, 'transit-countries')
      )

      const outside = await driveHandler(postHandlerOf(portOfEntry), {
        payload,
        seed: completeSeed,
        openingRun: RUN_COMPLETE
      })
      expect(outside.response.redirect).toBe(hubPath(outside.journeyId))
    })

    it('Should send roles and addresses to the overview outside the run, even for a consignment that needs a CPH number', async () => {
      const withoutCph = structuredClone(completeSeed)
      delete withoutCph.countyParishHoldingCph
      const { journeyId, response } = await driveHandler(
        postHandlerOf(addresses),
        { seed: withoutCph, openingRun: RUN_COMPLETE }
      )
      expect(response.redirect).toBe(hubPath(journeyId))
    })
  })

  describe('reaching the review ends the run', () => {
    it('Should flip the record to complete when the review page is shown', async () => {
      const { journeyId, cookies } = await driveHandler(
        getHandlerOf(checkAnswers),
        { openingRun: RUN_ACTIVE }
      )
      expect(cookies[openingRunCookie()]).toEqual({
        [journeyId]: RUN_COMPLETE
      })
    })
  })

  describe('the run is scoped to its journey', () => {
    it('Should open its own run alongside a record belonging to a different journey', async () => {
      const { journeyId, cookies } = await createNotification(
        runRecord('some-other-journey')
      )
      expect(cookies[openingRunCookie()]).toEqual({
        'some-other-journey': RUN_ACTIVE,
        [journeyId]: RUN_ACTIVE
      })
    })
  })

  describe('deep-link guard', deepLinkGuardTests)
})
