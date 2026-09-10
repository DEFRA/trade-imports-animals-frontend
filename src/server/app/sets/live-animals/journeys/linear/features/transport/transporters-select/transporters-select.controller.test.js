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
import { dispatchPages } from '../../index.js'
import { pagePath } from '../../../../../../../shared/paths.js'

import * as transportersSelect from './transporters-select.controller.js'

const ADD_SLUG = 'transporters/add'
const GARCIA_ID = 'garcia-livestock-transport'

const handlerFor = (method) =>
  transportersSelect.routes.find((route) => route.method === method).handler

const getHandler = handlerFor('GET')
const postHandler = handlerFor('POST')

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

/** Drive a POST whose save fails the way a backend outage fails it: recoverably,
 * so the register comes back with the banner rather than throwing. */
const driveSaveFailure = async (payload) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, { transporterType: 'Commercial' })
  const h = stubH()
  configureRecords({
    ...recordsStub,
    replaceFulfilment: () => {
      throw new BackendRequestError('save the transporter', {
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

// The register is a spoke off the add route, not a journey step, so Back has to
// point at the question that sent the trader here and keep the change context
// the hub needs to take them home again.
describe('/transporters/select', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should point Back at the add route', async () => {
    const result = await driveHandler(getHandler)

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, ADD_SLUG)
    )
  })

  it('Should keep the change context on Back when the trader is changing an answer', async () => {
    const result = await driveHandler(getHandler, { query: { change: '1' } })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, ADD_SLUG)}?change=1`
    )
  })

  it('Should hand a save while changing back to the summary', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: 'Commercial' },
      payload: { commercialTransporter: GARCIA_ID },
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'notification-view')
    })
  })

  it('Should reject a transporter that is not on the register', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: 'Commercial' },
      payload: { commercialTransporter: 'not-a-transporter' }
    })

    expect(result.view.context.errors.commercialTransporter).toBeTruthy()
    expect(result.view.context.errorSummary.errorList).toHaveLength(1)
    expect(result.after.commercialTransporter).toBeUndefined()
  })

  // The register saves through unfilled, the way the transporter pages always
  // have: a trader who has not chosen yet still walks on.
  it('Should walk on without saving when no transporter is picked', async () => {
    const result = await driveHandler(postHandler, {
      seed: { transporterType: 'Commercial' },
      payload: {}
    })

    expect(result.after.commercialTransporter).toBeUndefined()
    expect(result.response.redirect).toBeTruthy()
  })

  it('Should re-render the register at 500 with the pick kept after a recoverable save failure', async () => {
    const response = await driveSaveFailure({
      commercialTransporter: GARCIA_ID
    })

    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(response.context.recoverableError).toBe(true)
    expect(
      response.context.transporterOptions.find(
        (option) => option.value === GARCIA_ID
      ).checked
    ).toBe(true)
  })
})
