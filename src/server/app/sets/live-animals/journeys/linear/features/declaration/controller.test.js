import { SET_ID } from '../../../../set.js'
import { beforeEach, describe, expect, it } from 'vitest'

import { pagePath } from '../../../../../../shared/paths.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { configureReadyForCheckYourAnswers } from '../../../../../../engine/read.js'
import {
  addressBookRefusingAddresses,
  addressBookRequestUrls,
  expectOneLogged,
  expectNoRefusalLogged,
  fetchMock,
  journeyRequest,
  postHandlerOf,
  recordingLogger,
  resetMocksAndConfigAfterTests,
  stubH,
  expectOneSaveFallbackLogged,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as declaration from './controller.js'
import { continueRequest, reviewedState } from './test-support.js'
import { flowOnlyAnswersCookie } from '../../../../../../engine/persistence/session.js'

const post = postHandlerOf(declaration)
const get = declaration.routes.find((route) => route.method === 'GET').handler

const CHECK_ANSWERS_SLUG = 'notification-view'
const reviewPath = (journeyId, query = '') =>
  `${pagePath(journeyId, CHECK_ANSWERS_SLUG)}${query}`

const VALID_COPY = {
  name: 'Astra Rosales',
  phone: '01632 960000',
  email: 'astra-rosales@example.com',
  address: {
    addressLine1: '43 East Hague Extension',
    townOrCity: 'Bern',
    postcode: '30055',
    countryCode: 'CH'
  }
}

const drivePost = async ({
  step = 'declare',
  payload = {},
  seed = {},
  afterReview = async () => {},
  sessionConcurrencyToken = (reviewed) => reviewed
} = {}) => {
  const { journeyId } = await store.create()
  await store.seedAnswers(journeyId, seed)
  const { concurrencyToken: reviewedConcurrencyToken } =
    await store.get(journeyId)
  await afterReview(journeyId)
  const h = stubH()
  const logger = recordingLogger()
  const response = await post(
    journeyRequest(journeyId, {
      logger,
      payload: {
        step,
        concurrencyToken: `${reviewedConcurrencyToken}`,
        ...payload
      },
      state: reviewedState(
        journeyId,
        sessionConcurrencyToken(reviewedConcurrencyToken)
      )
    }),
    h
  )
  return {
    journeyId,
    reviewedConcurrencyToken,
    before: seed,
    after: (await store.get(journeyId)).answers,
    response,
    view: h.captured.view,
    cookies: h.cookies,
    logger
  }
}

const expectRefusalLogged = (result, expectedRefusal) =>
  expectOneLogged(result.logger, {
    level: 'info',
    fields: expect.objectContaining({
      journeyId: result.journeyId,
      refusal: expectedRefusal
    }),
    message: 'Declaration refused'
  })

const editElsewhere = (journeyId) =>
  store.seedAnswers(journeyId, { countryOfOrigin: 'DE' })

const CHANGED = '?staleAction=1'
const REFUSED = '?refused=1'

const useReadyDeclarationJourney = () => {
  useStubbedJourney(SET_ID, dispatchPages)
  beforeEach(() => configureReadyForCheckYourAnswers(SET_ID, () => true))
  resetMocksAndConfigAfterTests()
}

describe('#declaration', () => {
  useReadyDeclarationJourney()

  describe('GET /declaration', () => {
    it('Should send a bookmark or typed URL back to the review', async () => {
      const { journeyId } = await store.create()

      const response = await get(journeyRequest(journeyId), stubH())

      expect(response).toEqual({ redirect: reviewPath(journeyId) })
    })

    it('Should redirect a GET on an already-submitted journey to the confirmation page', async () => {
      const { journeyId } = await store.create()
      await store.submit(journeyId)

      const response = await get(journeyRequest(journeyId), stubH())

      expect(response).toEqual({
        redirect: pagePath(journeyId, 'confirmation')
      })
    })
  })

  describe('POST /declaration from the review (step=review)', () => {
    it('Should render the declaration carrying the token the review was rendered with', async () => {
      const result = await drivePost({ step: 'review' })

      expect(result.view.view).toBe(
        'live-animals/journeys/linear/features/declaration/template'
      )
      expect(result.view.context.concurrencyToken).toBe(
        result.reviewedConcurrencyToken
      )
      expect(result.view.context.values).toEqual({ declaration: '' })
    })

    it('Should log the refusal and send the trader back to the review with the changed banner when the notification changed after the review', async () => {
      const result = await drivePost({
        step: 'review',
        afterReview: editElsewhere
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, CHANGED)
      })
      expectRefusalLogged(
        result,
        declaration.DECLARATION_REFUSAL.changedSinceReview
      )
    })

    it('Should log the refusal and send the trader back to the review with its errors in focus when it is refused', async () => {
      configureReadyForCheckYourAnswers(SET_ID, () => false)

      const result = await drivePost({ step: 'review' })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
      expectRefusalLogged(result, declaration.DECLARATION_REFUSAL.reviewRefused)
    })

    it('Should log nothing when it renders the declaration', async () => {
      const result = await drivePost({ step: 'review' })

      expect(result.logger.entries).toEqual([])
    })
  })

  describe('POST /declaration from a browser that has not seen the review', () => {
    it.each(['review', 'declare'])(
      'Should log the refusal and send step=%s back to the review when the session never rendered it',
      async (step) => {
        const result = await drivePost({
          step,
          payload: { declaration: 'confirmed' },
          sessionConcurrencyToken: () => undefined
        })

        expect(result.response).toEqual({
          redirect: reviewPath(result.journeyId)
        })
        expect((await store.get(result.journeyId)).status).toBe('draft')
        expectRefusalLogged(
          result,
          declaration.DECLARATION_REFUSAL.reviewNotRecorded
        )
      }
    )

    it('Should send the trader back to the review when the session saw a different review', async () => {
      const result = await drivePost({
        step: 'review',
        sessionConcurrencyToken: (reviewed) => reviewed + 1
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId)
      })
    })
  })

  describe('POST /declaration with no recognised step', () => {
    it('Should log the refusal and send the trader back to the review', async () => {
      const result = await drivePost({
        step: null,
        payload: { declaration: 'confirmed' }
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId)
      })
      expect((await store.get(result.journeyId)).status).toBe('draft')
      expectRefusalLogged(result, declaration.DECLARATION_REFUSAL.unknownStep)
    })
  })
})

describe('#declaration submit', () => {
  useReadyDeclarationJourney()

  describe('POST /declaration to submit (step=declare)', () => {
    it('Should re-render an unconfirmed declaration with its message, the reviewed token, and commit nothing', async () => {
      const result = await drivePost({ payload: { declaration: '' } })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors.declaration).toBe(
        'Confirm that you have reviewed and comply with this declaration'
      )
      expect(result.view.context.concurrencyToken).toBe(
        result.reviewedConcurrencyToken
      )
      expect(result.after).toEqual(result.before)
      expectNoRefusalLogged(result.logger)
    })

    it('Should redirect to the confirmation page after a successful submit', async () => {
      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'confirmation')
      })
    })

    it('Should submit the notification and redirect to the confirmation page when the declaration is confirmed', async () => {
      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'confirmation')
      })
      expect((await store.get(result.journeyId)).status).toBe('submitted')
    })

    it('Should refuse the submit when the notification changed after the declaration rendered', async () => {
      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        afterReview: editElsewhere
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, CHANGED)
      })
      expect((await store.get(result.journeyId)).status).toBe('draft')
    })

    it('Should check the reviewed token, not the current one, when an unticked declaration is resubmitted after a change', async () => {
      const result = await drivePost({
        payload: { declaration: '' },
        afterReview: editElsewhere
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, CHANGED)
      })
    })

    it('Should submit the copied address as stored, never consulting the address book', async () => {
      addressBookRefusingAddresses()

      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        seed: { consignor: VALID_COPY }
      })

      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'confirmation')
      })
      expect(result.after.consignor).toEqual(VALID_COPY)
      expect(addressBookRequestUrls()).toEqual([])
    })

    it('Should refuse the submit while a copied address breaks the rules', async () => {
      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        seed: { consignor: { ...VALID_COPY, email: 'not-an-email' } }
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
      expect((await store.get(result.journeyId)).status).toBe('draft')
    })

    it('Should keep the not-ready outcome as a redirect to the review', async () => {
      configureReadyForCheckYourAnswers(SET_ID, () => false)

      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
    })

    it('Should redirect to the review when a stored answer has gone stale', async () => {
      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        seed: { animalsCertifiedFor: 'not-a-purpose' }
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
      expect((await store.get(result.journeyId)).status).toBe('draft')
    })

    it('Should redirect to the review when a stored port has been withdrawn', async () => {
      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        seed: { portOfEntry: 'GB ZZZ' }
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
      expect((await store.get(result.journeyId)).status).toBe('draft')
    })

    it('Should redirect an already-submitted POST retry to confirmation', async () => {
      const { journeyId } = await store.create()
      await store.submit(journeyId)

      const response = await post(
        journeyRequest(journeyId, {
          payload: { step: 'declare', declaration: 'confirmed' }
        }),
        stubH()
      )

      expect(response).toEqual({
        redirect: pagePath(journeyId, 'confirmation')
      })
    })
  })
})

describe('#declaration submit against the real records adapter', () => {
  useReadyDeclarationJourney()

  describe('backend submit', () => {
    const backendResponds = (response) => {
      fetchMock.enableMocks()
      fetchMock.mockResponse(async () => response)
    }
    const staleConcurrencyTokenResponse = {
      status: 409,
      statusText: 'Conflict',
      body: JSON.stringify({ code: 'STALE_CONCURRENCY_TOKEN' })
    }

    beforeEach(() => {
      configureRecords(SET_ID, {
        ...recordsStub,
        finalise: realRecords.finalise
      })
    })

    it('Should send the trader back to the review when an edit lands between the check and the submit', async () => {
      backendResponds(staleConcurrencyTokenResponse)

      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, CHANGED)
      })
    })

    it('Should render the declaration unticked when the trader continues from the review after a submit refused as changed', async () => {
      backendResponds(staleConcurrencyTokenResponse)
      const refused = await drivePost({ payload: { declaration: 'confirmed' } })
      const sessionAfterRefusal = refused.cookies[flowOnlyAnswersCookie()]
      expect(sessionAfterRefusal[refused.journeyId]).toEqual({
        declaration: 'confirmed'
      })
      const { concurrencyToken } = await store.get(refused.journeyId)
      const h = stubH()

      await post(
        continueRequest(
          journeyRequest(refused.journeyId, {
            state: { [flowOnlyAnswersCookie()]: sessionAfterRefusal }
          }),
          concurrencyToken
        ),
        h
      )

      expect(h.captured.view.context.values).toEqual({ declaration: '' })
    })

    it('Should re-render declaration at 500 with its checked value, the reviewed token, banner and retry form', async () => {
      const failure = unavailableBackendError('submit notification')
      backendResponds({
        status: 503,
        statusText: 'Service Unavailable',
        body: ''
      })

      const result = await drivePost({
        payload: { declaration: 'confirmed', crumb: 'test-crumb' }
      })

      expect(result.response.statusCode).toBe(500)
      expect(result.view.context.recoverableError).toBe(true)
      expect(result.view.context.concurrencyToken).toBe(
        result.reviewedConcurrencyToken
      )
      expect(result.view.context.values).toEqual({
        declaration: 'confirmed'
      })
      expect(result.view.view).toBe(
        'live-animals/journeys/linear/features/declaration/template'
      )
      expectOneSaveFallbackLogged(result.logger, {
        journeyId: result.journeyId,
        err: failure
      })
    })
  })
})
