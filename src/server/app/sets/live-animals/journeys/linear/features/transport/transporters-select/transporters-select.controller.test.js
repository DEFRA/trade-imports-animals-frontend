import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
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
})
