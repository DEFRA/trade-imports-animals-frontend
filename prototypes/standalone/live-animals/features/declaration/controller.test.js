import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { pagePath } from '../../config.js'
import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
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
        configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
      })
      beforeEach(() => store.clear())

      it('Should re-render an unconfirmed declaration with its message and commit nothing', async () => {
        const result = await driveHandler(post, {
          payload: { declaration: '' }
        })
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
        expect(result.response).toEqual({ redirect: pagePath('confirmation') })
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

      expect(response).toEqual({ redirect: pagePath('confirmation') })
    })
  })
})
