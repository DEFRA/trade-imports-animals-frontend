import { SET_ID } from '../../../set.js'
import { describe, expect, it } from 'vitest'

import { createRoutePath, pagePath } from '../../../../../shared/paths.js'
import {
  knownJourneysCookie,
  openingRunCookie
} from '../../../../../engine/persistence/session.js'
import {
  driveHandler,
  getHandlerOf,
  journeyRequest,
  openedFromChangeLink,
  openingRunAt,
  openingRunCookieFor,
  postHandlerOf,
  stubH,
  useStubbedJourney
} from '../../../../../engine/test-support.js'
import { dispatchPages } from '../features/index.js'
import { RUN_ACTIVE, RUN_COMPLETE } from '../../../../../flow/run-state.js'

import * as origin from '../features/origin/controller.js'
import * as checkAnswers from '../features/check-answers/controller.js'
import * as hub from '../features/hub/controller.js'
import * as dashboard from '../features/dashboard/controller.js'

const ORIGIN_SLUG = 'origin'
const COMMODITIES_SLUG = 'commodities'

const originPayload = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no'
}

const postOrigin = ({ journeyId, state, startingFrom } = {}) =>
  driveHandler(postHandlerOf(origin), {
    payload: originPayload,
    journeyId,
    state,
    startingFrom
  })

const startPostHandler = () =>
  dashboard.routes.find(
    (route) => route.method === 'POST' && route.path === createRoutePath()
  ).handler

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

describe('the opening run', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  describe('creating a notification opens it', () => {
    it('Should land Start a new notification on origin with the run already begun', async () => {
      const { journeyId, response, cookies } = await createNotification()
      expect(response.redirect).toBe(pagePath(journeyId, ORIGIN_SLUG))
      expect(cookies[openingRunCookie()]).toEqual({ [journeyId]: RUN_ACTIVE })
    })
  })

  describe('reaching the hub ends the run', () => {
    const hubGet = hub.routes[0].handler

    it('Should flip the record to complete on hub arrival', async () => {
      const { journeyId, cookies } = await driveHandler(hubGet, {
        startingFrom: [openingRunAt(RUN_ACTIVE)]
      })
      expect(cookies[openingRunCookie()]).toEqual({
        [journeyId]: RUN_COMPLETE
      })
    })

    it('Should leave a completed record alone on later hub visits', async () => {
      const { cookies } = await driveHandler(hubGet, {
        startingFrom: [openingRunAt(RUN_COMPLETE)]
      })
      expect(openingRunCookie() in cookies).toBe(false)
    })

    it('Should write no run record when origin is saved once the run is complete', async () => {
      const { journeyId, response, cookies } = await postOrigin({
        startingFrom: [openingRunAt(RUN_COMPLETE)]
      })
      expect(response.redirect).toBe(pagePath(journeyId, COMMODITIES_SLUG))
      expect(openingRunCookie() in cookies).toBe(false)
    })

    it('Should write no run record when origin is saved from a Change link once the run is complete', async () => {
      const { journeyId, response, cookies } = await postOrigin({
        startingFrom: [openedFromChangeLink(), openingRunAt(RUN_COMPLETE)]
      })
      expect(response.redirect).toBe(pagePath(journeyId, COMMODITIES_SLUG))
      expect(openingRunCookie() in cookies).toBe(false)
    })
  })

  describe('reaching the review ends the run', () => {
    it('Should flip the record to complete when the review page is shown', async () => {
      const { journeyId, cookies } = await driveHandler(
        getHandlerOf(checkAnswers),
        { startingFrom: [openingRunAt(RUN_ACTIVE)] }
      )
      expect(cookies[openingRunCookie()]).toEqual({
        [journeyId]: RUN_COMPLETE
      })
    })
  })

  describe('the run is scoped to its journey', () => {
    it('Should open its own run alongside a record belonging to a different journey', async () => {
      const { journeyId, cookies } = await createNotification(
        openingRunCookieFor('some-other-journey', RUN_ACTIVE)
      )
      expect(cookies[openingRunCookie()]).toEqual({
        'some-other-journey': RUN_ACTIVE,
        [journeyId]: RUN_ACTIVE
      })
    })
  })
})
