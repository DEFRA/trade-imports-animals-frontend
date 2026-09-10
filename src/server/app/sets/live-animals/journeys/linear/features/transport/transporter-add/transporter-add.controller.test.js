import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { BackendRequestError } from '../../../../../../../services/persistence/records/errors.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  stubH
} from '../../../../../../../engine/test-support.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'
import {
  COMMERCIAL,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { dispatchPages } from '../../index.js'

import * as transporterAdd from './transporter-add.controller.js'

const LIST_SLUG = 'transporters'
const SELECT_SLUG = 'transporters/select'
const PRIVATE_SLUG = 'transporters/add/private'

const handlerFor = (method) =>
  transporterAdd.routes.find((route) => route.method === method).handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

/** Drive a POST whose save fails the way a backend outage fails it: recoverably,
 * so the question comes back with the banner rather than throwing. */
const driveSaveFailure = async (payload) => {
  const journey = await store.create()
  const h = stubH()
  configureRecords({
    ...recordsStub,
    replaceFulfilment: () => {
      throw new BackendRequestError('save the transporter type', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    }
  })
  try {
    return await postHandler(journeyRequest(journey.journeyId, { payload }), h)
  } finally {
    configureRecords(recordsStub)
  }
}

// The type question is a spoke off the list, asked only of a trader who could
// not find their transporter on it, so Back and both onward arms point at the
// add route's own pages rather than at journey steps.
describe('/transporters/add', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should point Back at the transporter list', async () => {
    const result = await driveHandler(getHandler)

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, LIST_SLUG)
    )
  })

  it('Should keep the change context on Back when the trader is changing an answer', async () => {
    const result = await driveHandler(getHandler, { query: { change: '1' } })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, LIST_SLUG)}?change=1`
    )
  })

  it('Should leave the type unanswered before one is chosen', async () => {
    const result = await driveHandler(getHandler)

    expect(result.view.context.values.transporterType).toBe('')
  })

  it('Should show the type already on the notification', async () => {
    const result = await driveHandler(getHandler, {
      seed: { transporterType: COMMERCIAL }
    })

    expect(result.view.context.values.transporterType).toBe(COMMERCIAL)
  })

  it('Should send a commercial transporter to the approved register', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: COMMERCIAL }
    })

    expect(result.after.transporterType).toBe(COMMERCIAL)
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, SELECT_SLUG)
    })
  })

  it('Should send a private transporter to the details form', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: PRIVATE }
    })

    expect(result.after.transporterType).toBe(PRIVATE)
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, PRIVATE_SLUG)
    })
  })

  // An unanswered question adds nothing, so it hands the trader back to the
  // list rather than into either arm of the add route.
  it('Should send an unanswered question back to the list', async () => {
    const result = await driveHandler(postHandler, { payload: {} })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, LIST_SLUG)
    })
  })

  it('Should keep the change context on the onward redirect', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: COMMERCIAL },
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, SELECT_SLUG)}?change=1`
    })
  })

  it('Should reject a transporter type the journey does not offer', async () => {
    const result = await driveHandler(postHandler, {
      payload: { transporterType: 'Municipal' }
    })

    expect(result.view.context.errors.transporterType).toBeTruthy()
    expect(result.view.context.errorSummary.errorList).toHaveLength(1)
    expect(result.after.transporterType).toBeUndefined()
  })

  it('Should re-render the question at 500 with the answer kept after a recoverable save failure', async () => {
    const response = await driveSaveFailure({ transporterType: COMMERCIAL })

    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.context.recoverableError).toBe(true)
    expect(response.context.values.transporterType).toBe(COMMERCIAL)
  })
})
