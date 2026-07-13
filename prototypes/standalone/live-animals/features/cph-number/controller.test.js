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

import * as cphNumber from './controller.js'

const postCph = postHandlerOf(cphNumber)

const seed = () => ({ commodityLines: [{ commoditySelection: 'Cow' }] })

describe('POST cph-number — slash stripping', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should commit the CPH with slashes stripped', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '12/345/6789' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('123456789')
  })

  it('Should validate the stripped value, not the raw value', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '123456789/12' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('12345678912')
  })
})
