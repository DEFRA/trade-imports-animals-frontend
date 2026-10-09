import { SET_ID } from '../../../../set.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { pagePath } from '../../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../../../../../engine/read.js'
import {
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as declaration from './controller.js'
import { reviewedState } from './test-support.js'
import { reviewedTokensCookie } from '../../../../../../engine/persistence/session.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import * as refusal from '../check-answers/refusal.js'
import { records } from '../../../../../../engine/persistence/records.js'

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

/** Posts to the declaration at the token the review rendered with — the
 * journey's token once seeded — from a session that saw that review, unless
 * `sessionToken` says otherwise. `afterReview` runs between the review and the
 * post, standing in for an edit made in another tab or by another user. */
const drivePost = async ({
  step = 'declare',
  payload = {},
  seed = {},
  afterReview = async () => {},
  sessionToken = (reviewed) => reviewed
} = {}) => {
  const { journeyId } = await store.create()
  await store.seedAnswers(journeyId, seed)
  const { concurrencyToken: reviewedToken } = await store.get(journeyId)
  await afterReview(journeyId)
  const h = stubH()
  const response = await post(
    journeyRequest(journeyId, {
      payload: { step, concurrencyToken: `${reviewedToken}`, ...payload },
      state: reviewedState(journeyId, sessionToken(reviewedToken))
    }),
    h
  )
  return {
    journeyId,
    reviewedToken,
    before: seed,
    after: (await store.get(journeyId)).answers,
    response,
    view: h.captured.view,
    cookies: h.cookies
  }
}

const editElsewhere = (journeyId) =>
  store.seedAnswers(journeyId, { countryOfOrigin: 'DE' })

const CHANGED = '?staleAction=1'
const REFUSED = '?refused=1'

const setupDeclarationEngine = () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => {
    store.clear()
    configureReadyForCheckYourAnswers(SET_ID, () => true)
  })
  afterEach(() => vi.restoreAllMocks())
}

describe('#declaration', () => {
  setupDeclarationEngine()

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
      expect(result.view.context.concurrencyToken).toBe(result.reviewedToken)
      expect(result.view.context.values).toEqual({ declaration: '' })
    })

    it('Should send the trader back to the review with the changed banner when the notification changed after the review', async () => {
      const result = await drivePost({
        step: 'review',
        afterReview: editElsewhere
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, CHANGED)
      })
    })

    it('Should send the trader back to the review with its errors in focus when it is refused', async () => {
      configureReadyForCheckYourAnswers(SET_ID, () => false)

      const result = await drivePost({ step: 'review' })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
    })
  })

  describe('POST /declaration from a browser that has not seen the review', () => {
    it.each(['review', 'declare'])(
      'Should send step=%s back to the review when the session never rendered it',
      async (step) => {
        const finaliseSpy = vi.spyOn(records, 'finalise')

        const result = await drivePost({
          step,
          payload: { declaration: 'confirmed' },
          sessionToken: () => undefined
        })

        expect(result.response).toEqual({
          redirect: reviewPath(result.journeyId)
        })
        expect(finaliseSpy).not.toHaveBeenCalled()
      }
    )

    it('Should send the trader back to the review when the session saw a different review', async () => {
      const result = await drivePost({
        step: 'review',
        sessionToken: (reviewed) => reviewed + 1
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId)
      })
    })
  })

  describe('POST /declaration with no recognised step', () => {
    it('Should send the trader back to the review', async () => {
      const finaliseSpy = vi.spyOn(records, 'finalise')

      const result = await drivePost({
        step: null,
        payload: { declaration: 'confirmed' }
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId)
      })
      expect(finaliseSpy).not.toHaveBeenCalled()
    })
  })
})

describe('#declaration submit', () => {
  setupDeclarationEngine()

  describe('POST /declaration to submit (step=declare)', () => {
    it('Should re-render an unconfirmed declaration with its message, the reviewed token, and commit nothing', async () => {
      const result = await drivePost({ payload: { declaration: '' } })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors.declaration).toBe(
        'Confirm that you have reviewed and comply with this declaration'
      )
      expect(result.view.context.concurrencyToken).toBe(result.reviewedToken)
      expect(result.after).toEqual(result.before)
    })

    it('Should redirect to the confirmation page after a successful submit, forgetting the review', async () => {
      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'confirmation')
      })
      expect(result.cookies[reviewedTokensCookie()]).toEqual({})
    })

    it('Should finalise at the token the review was rendered with', async () => {
      const finaliseSpy = vi.spyOn(records, 'finalise')

      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(finaliseSpy).toHaveBeenCalledTimes(1)
      expect(finaliseSpy.mock.calls[0][0]).toBe(result.journeyId)
      expect(finaliseSpy.mock.calls[0][2]).toBe(result.reviewedToken)
    })

    it('Should refuse the submit when the notification changed after the declaration rendered', async () => {
      const finaliseSpy = vi.spyOn(records, 'finalise')

      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        afterReview: editElsewhere
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, CHANGED)
      })
      expect(finaliseSpy).not.toHaveBeenCalled()
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
      const partySpy = vi.spyOn(addressBook, 'party')

      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        seed: { consignor: VALID_COPY }
      })

      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'confirmation')
      })
      expect(result.after.consignor).toEqual(VALID_COPY)
      expect(partySpy).not.toHaveBeenCalled()
    })

    it('Should refuse the submit while a copied address breaks the rules', async () => {
      const finaliseSpy = vi.spyOn(records, 'finalise')

      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        seed: { consignor: { ...VALID_COPY, email: 'not-an-email' } }
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
      expect(finaliseSpy).not.toHaveBeenCalled()
    })

    it('Should keep the not-ready outcome as a redirect to the review', async () => {
      configureReadyForCheckYourAnswers(SET_ID, () => false)

      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
    })

    it('Should redirect to the review when a stored answer has gone stale', async () => {
      vi.spyOn(refusal, 'isReviewRefused').mockResolvedValue(true)
      // seedAnswers itself calls replaceFulfilment, so finalise — only
      // submitJourney calls it — is the signal that nothing was submitted.
      const finaliseSpy = vi.spyOn(records, 'finalise')

      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
      expect(finaliseSpy).not.toHaveBeenCalled()
    })

    it('Should redirect to the review when a stored port has been withdrawn', async () => {
      const finaliseSpy = vi.spyOn(records, 'finalise')

      const result = await drivePost({
        payload: { declaration: 'confirmed' },
        seed: { portOfEntry: 'GB ZZZ' }
      })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, REFUSED)
      })
      expect(finaliseSpy).not.toHaveBeenCalled()
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
  setupDeclarationEngine()

  describe('backend submit', () => {
    const backendResponds = (response) =>
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ...response, clone: () => response }))
      )

    beforeEach(() => {
      configureRecords(SET_ID, {
        ...recordsStub,
        finalise: realRecords.finalise
      })
    })

    afterEach(() => {
      configureRecords(SET_ID, recordsStub)
      vi.unstubAllGlobals()
    })

    it('Should send the trader back to the review when an edit lands between the check and the submit', async () => {
      backendResponds({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ code: 'STALE_CONCURRENCY_TOKEN' })
      })

      const result = await drivePost({ payload: { declaration: 'confirmed' } })

      expect(result.response).toEqual({
        redirect: reviewPath(result.journeyId, CHANGED)
      })
    })

    it('Should re-render declaration at 500 with its checked value, the reviewed token, banner and retry form', async () => {
      backendResponds({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })

      const result = await drivePost({
        payload: { declaration: 'confirmed', crumb: 'test-crumb' }
      })

      expect(result.response.statusCode).toBe(500)
      expect(result.view.context.recoverableError).toBe(true)
      expect(result.view.context.concurrencyToken).toBe(result.reviewedToken)
      expect(result.view.context.values).toEqual({
        declaration: 'confirmed'
      })
      expect(result.view.view).toBe(
        'live-animals/journeys/linear/features/declaration/template'
      )
    })
  })
})
