import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath } from '../../config.js'
import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { journeyRequest, stubH } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as confirmation from './controller.js'

const get = confirmation.routes.find((route) => route.method === 'GET').handler

describe('GET /confirmation', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should render the confirmation panel with the reference and submission date for a submitted notification', async () => {
    const { journeyId } = await store.create()
    await store.submit(journeyId)
    const h = stubH()

    await get(journeyRequest(journeyId), h)

    expect(h.captured.view.context.pageTitle).toBe(
      'Import notification submitted'
    )
    expect(h.captured.view.context.referenceNumber).toBe(journeyId)
    expect(h.captured.view.context.submissionDate).toMatch(
      /^\d{1,2} \w+ \d{4}$/
    )
  })

  it('Should redirect a notification that is not submitted to the hub', async () => {
    const { journeyId } = await store.create()

    const response = await get(journeyRequest(journeyId), stubH())

    expect(response).toEqual({ redirect: hubPath() })
  })
})
