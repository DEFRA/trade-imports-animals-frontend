import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as importPurpose from './controller.js'

const post = postHandlerOf(importPurpose)

describe('POST import-purpose — invalid payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should answer 400 and re-render an out-of-list purpose, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { purposeInInternalMarket: 'not-a-real-purpose' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.purposeInInternalMarket).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})
