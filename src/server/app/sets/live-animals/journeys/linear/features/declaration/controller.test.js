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
import * as reinflate from '../addresses/reinflate-party-answers.js'
import * as refusal from '../check-answers/refusal.js'
import { records } from '../../../../../../engine/persistence/records.js'

const post = postHandlerOf(declaration)
const get = declaration.routes.find((route) => route.method === 'GET').handler

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

      it('Should persist reinflated party answers before submit', async () => {
        configureReadyForCheckYourAnswers(SET_ID, () => true)
        // The refusal predicate needs the address book set up to resolve the
        // seeded consignor; this test is about the reinflate/replace order,
        // not the refusal path, so short-circuit it.
        vi.spyOn(refusal, 'isReviewRefused').mockResolvedValue(false)
        const inflated = {
          consignor: {
            addressId: 'consignor-1',
            name: 'Frozen Consignor',
            address: { addressLine1: '1 Test Street' }
          }
        }
        const reinflateSpy = vi
          .spyOn(reinflate, 'reinflatePartyAnswers')
          .mockResolvedValue(inflated)
        const replaceSpy = vi.spyOn(records, 'replaceFulfilment')

        await driveHandler(post, {
          payload: { declaration: 'confirmed' },
          seed: { consignor: { addressId: 'consignor-1' } }
        })

        expect(reinflateSpy).toHaveBeenCalledOnce()
        const reinflateOrder = reinflateSpy.mock.invocationCallOrder[0]
        const replaceAfterReinflate = replaceSpy.mock.calls.find(
          (_, index) =>
            replaceSpy.mock.invocationCallOrder[index] > reinflateOrder
        )
        expect(replaceAfterReinflate).toBeDefined()
      })

      it('Should keep the not-ready outcome as a redirect to check answers', async () => {
        configureReadyForCheckYourAnswers(SET_ID, () => false)
        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed' }
        })
        expect(result.response).toEqual({
          redirect: pagePath(result.journeyId, 'notification-view')
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
          redirect: pagePath(result.journeyId, 'notification-view')
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
