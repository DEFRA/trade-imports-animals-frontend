import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as importReason from './controller.js'

const post = postHandlerOf(importReason)

describe('POST import-reason — invalid payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should answer 400 and re-render an out-of-list reason, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { reasonForImport: 'not-a-real-reason' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.reasonForImport).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})
