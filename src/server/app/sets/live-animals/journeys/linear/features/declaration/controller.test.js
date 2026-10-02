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
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as declaration from './controller.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import * as refusal from '../check-answers/refusal.js'
import { records } from '../../../../../../engine/persistence/records.js'

const post = postHandlerOf(declaration)
const get = declaration.routes.find((route) => route.method === 'GET').handler

const CHECK_ANSWERS_SLUG = 'notification-view'

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

describe('#declaration', () => {
  describe('POST /declaration', () => {
    describe('invalid payload', () => {
      beforeAll(() => {
        configureRecords(SET_ID, recordsStub)
        configureSession(SET_ID, sessionStub)
        buildDispatch(SET_ID, dispatchPages)
      })
      beforeEach(() => store.clear())

      it('Should re-render an unconfirmed declaration with its message and commit nothing', async () => {
        const result = await driveHandler(post, {
          payload: { declaration: '' }
        })
        expect(result.response.statusCode).toBe(400)
        expect(result.view.context.errors.declaration).toBe(
          'Confirm that you have reviewed and comply with this declaration'
        )
        expect(result.after).toEqual(result.before)
      })
    })

    describe('submitted journeys land on the confirmation page', () => {
      beforeAll(() => {
        configureRecords(SET_ID, recordsStub)
        configureSession(SET_ID, sessionStub)
        buildDispatch(SET_ID, dispatchPages)
      })
      beforeEach(() => store.clear())
      afterEach(() => vi.restoreAllMocks())

      it('Should redirect to the confirmation page after a successful submit', async () => {
        configureReadyForCheckYourAnswers(SET_ID, () => true)
        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed' }
        })
        expect(result.response).toEqual({
          redirect: pagePath(result.journeyId, 'confirmation')
        })
      })

      it('Should submit the copied address as stored, never consulting the address book', async () => {
        configureReadyForCheckYourAnswers(SET_ID, () => true)
        const partySpy = vi.spyOn(addressBook, 'party')

        const result = await driveHandler(post, {
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
        configureReadyForCheckYourAnswers(SET_ID, () => true)
        const finaliseSpy = vi.spyOn(records, 'finalise')

        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed' },
          seed: { consignor: { ...VALID_COPY, email: 'not-an-email' } }
        })

        expect(result.response).toEqual({
          redirect: pagePath(result.journeyId, CHECK_ANSWERS_SLUG)
        })
        expect(finaliseSpy).not.toHaveBeenCalled()
      })

      it('Should keep the not-ready outcome as a redirect to check answers', async () => {
        configureReadyForCheckYourAnswers(SET_ID, () => false)
        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed' }
        })
        expect(result.response).toEqual({
          redirect: pagePath(result.journeyId, CHECK_ANSWERS_SLUG)
        })
      })

      it('Should redirect to check answers when a stored answer has gone stale', async () => {
        configureReadyForCheckYourAnswers(SET_ID, () => true)
        vi.spyOn(refusal, 'isReviewRefused').mockResolvedValue(true)
        // seedAnswers itself calls replaceFulfilment, so finalise — only
        // submitJourney calls it — is the signal that nothing was submitted.
        const finaliseSpy = vi.spyOn(records, 'finalise')

        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed' }
        })

        expect(result.response).toEqual({
          redirect: pagePath(result.journeyId, CHECK_ANSWERS_SLUG)
        })
        expect(finaliseSpy).not.toHaveBeenCalled()
      })

      it('Should redirect to check answers when a stored port has been withdrawn', async () => {
        configureReadyForCheckYourAnswers(SET_ID, () => true)
        const finaliseSpy = vi.spyOn(records, 'finalise')

        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed' },
          seed: { portOfEntry: 'GB ZZZ' }
        })

        expect(result.response).toEqual({
          redirect: pagePath(result.journeyId, CHECK_ANSWERS_SLUG)
        })
        expect(finaliseSpy).not.toHaveBeenCalled()
      })

      it('Should redirect an already-submitted POST retry to confirmation', async () => {
        configureReadyForCheckYourAnswers(SET_ID, () => true)
        const { journeyId } = await store.create()
        await store.submit(journeyId)

        const response = await post(
          journeyRequest(journeyId, {
            payload: { declaration: 'confirmed' }
          }),
          stubH()
        )

        expect(response).toEqual({
          redirect: pagePath(journeyId, 'confirmation')
        })
      })
    })

    describe('recoverable backend failure', () => {
      beforeAll(() => {
        configureSession(SET_ID, sessionStub)
        buildDispatch(SET_ID, dispatchPages)
      })

      beforeEach(() => {
        store.clear()
        configureReadyForCheckYourAnswers(SET_ID, () => true)
        configureRecords(SET_ID, {
          ...recordsStub,
          finalise: realRecords.finalise
        })
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => ({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable'
          }))
        )
      })

      afterEach(() => {
        configureRecords(SET_ID, recordsStub)
        vi.unstubAllGlobals()
      })

      it('Should re-render declaration at 500 with its checked value, banner and retry form', async () => {
        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed', crumb: 'test-crumb' }
        })

        expect(result.response.statusCode).toBe(500)
        expect(result.view.context.recoverableError).toBe(true)
        expect(result.view.context.values).toEqual({
          declaration: 'confirmed'
        })
        expect(result.view.view).toBe(
          'live-animals/journeys/linear/features/declaration/template'
        )
      })
    })
  })

  describe('GET /declaration', () => {
    beforeAll(() => {
      configureRecords(SET_ID, recordsStub)
      configureSession(SET_ID, sessionStub)
      buildDispatch(SET_ID, dispatchPages)
    })
    beforeEach(() => store.clear())

    it('Should redirect a GET on an already-submitted journey to the confirmation page', async () => {
      configureReadyForCheckYourAnswers(SET_ID, () => true)
      const { journeyId } = await store.create()
      await store.submit(journeyId)

      const response = await get(journeyRequest(journeyId), stubH())

      expect(response).toEqual({
        redirect: pagePath(journeyId, 'confirmation')
      })
    })
  })
})
