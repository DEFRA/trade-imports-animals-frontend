import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

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
  postHandlerEndingWith
} from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as select from './select.controller.js'

const postAdd = postHandlerEndingWith(select, 'commodities/select')

describe('POST commodities/select — invalid payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render a missing commoditySelection with its message and append nothing', async () => {
    const result = await driveHandler(postAdd, {
      payload: { typeSelection: 'Domestic' }
    })
    expect(result.view.context.errors.commoditySelection).toBe(
      'Select a commodity'
    )
    expect(result.after).toEqual(result.before)
  })
})
