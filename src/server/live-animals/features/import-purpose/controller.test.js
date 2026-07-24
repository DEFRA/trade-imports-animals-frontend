import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { records as realRecords } from '../../services/persistence/records/real.js'
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

describe('POST import-purpose — save failures', () => {
  beforeAll(() => {
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })

  beforeEach(() => {
    store.clear()
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

  const failingOnControllerCommit = (failure) => {
    let replaceCalls = 0
    configureRecords({
      ...recordsStub,
      replaceFulfilment: (...args) => {
        replaceCalls += 1
        return replaceCalls === 1
          ? recordsStub.replaceFulfilment(...args)
          : failure(...args)
      }
    })
  }

  it('Should re-render a real backend request failure at 500 with the cleaned value and banner', async () => {
    failingOnControllerCommit(realRecords.replaceFulfilment)

    const result = await driveHandler(post, {
      payload: { purposeInInternalMarket: 'breeding' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values).toEqual({
      purposeInInternalMarket: 'breeding'
    })
  })

  it('Should let a programming error escape to the promoted catch-all without an in-page banner', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, {
        payload: { purposeInInternalMarket: 'breeding' }
      })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
