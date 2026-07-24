import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { pagePath } from '../../config.js'
import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { records as realRecords } from '../../services/persistence/records/real.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as declaration from './controller.js'

const post = postHandlerOf(declaration)
const get = declaration.routes.find((route) => route.method === 'GET').handler

describe('#declaration', () => {
  describe('POST /declaration', () => {
    describe('invalid payload', () => {
      beforeAll(() => {
        configureRecords(recordsStub)
        configureSession(sessionStub)
        buildDispatch(dispatchPages)
      })
      beforeEach(() => store.clear())

      it('Should re-render an unconfirmed declaration with its message and commit nothing', async () => {
        const result = await driveHandler(post, {
          payload: { declaration: '' }
        })
        expect(result.response.statusCode).toBe(400)
        expect(result.view.context.errors.declaration).toBe(
          'Confirm that the information is true and correct before submitting'
        )
        expect(result.after).toEqual(result.before)
      })
    })

    describe('submitted journeys land on the confirmation page', () => {
      beforeAll(() => {
        configureRecords(recordsStub)
        configureSession(sessionStub)
        buildDispatch(dispatchPages)
      })
      beforeEach(() => store.clear())

      it('Should redirect to the confirmation page after a successful submit', async () => {
        configureReadyForCheckYourAnswers(() => true)
        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed' }
        })
        expect(result.response).toEqual({
          redirect: pagePath(result.journeyId, 'confirmation')
        })
      })

      it('Should keep the not-ready outcome as a redirect to check answers', async () => {
        configureReadyForCheckYourAnswers(() => false)
        const result = await driveHandler(post, {
          payload: { declaration: 'confirmed' }
        })
        expect(result.response).toEqual({
          redirect: pagePath(result.journeyId, 'notification-view')
        })
      })

      it('Should redirect an already-submitted POST retry to confirmation', async () => {
        configureReadyForCheckYourAnswers(() => true)
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
        configureSession(sessionStub)
        buildDispatch(dispatchPages)
      })

      beforeEach(() => {
        store.clear()
        configureReadyForCheckYourAnswers(() => true)
        configureRecords({ ...recordsStub, finalise: realRecords.finalise })
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
        configureRecords(recordsStub)
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
          'live-animals/features/declaration/template'
        )
      })
    })
  })

  describe('GET /declaration', () => {
    beforeAll(() => {
      configureRecords(recordsStub)
      configureSession(sessionStub)
      buildDispatch(dispatchPages)
    })
    beforeEach(() => store.clear())

    it('Should redirect a GET on an already-submitted journey to the confirmation page', async () => {
      configureReadyForCheckYourAnswers(() => true)
      const { journeyId } = await store.create()
      await store.submit(journeyId)

      const response = await get(journeyRequest(journeyId), stubH())

      expect(response).toEqual({
        redirect: pagePath(journeyId, 'confirmation')
      })
    })
  })
})
