import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { store } from './engine/store.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { records as recordsStub } from './services/persistence/records/stub.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import { driveHandler } from './engine/test-support.js'
import { dispatchPages } from './features/index.js'
import * as state from './engine/index.js'
import { compose, currency, validate } from './lib/validate/index.js'

const drive = driveHandler

const fields = compose(currency('syntheticAmount'))

// The commit lands on a real obligation key (transportDocumentReference) —
// the write guard rejects unrecognised keys, and this test's subject is the
// currency cleaning, not the key.
const syntheticCurrencyPost = async (request, h) => {
  const payload = request.payload ?? {}
  const raw = (payload.syntheticAmount ?? '').trim()
  const { value: clean, errors } = validate(fields, payload)
  if (errors) return h.view('synthetic', { value: raw, errors })
  await state.commit(request, h, {
    transportDocumentReference: clean.syntheticAmount ?? ''
  })
  return h.redirect('/next')
}

describe('T1 — cleaned currency values are persisted, not the raw payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should persist a currency amount with £ and commas stripped', async () => {
    const { after } = await drive(syntheticCurrencyPost, {
      payload: { syntheticAmount: '£1,500' }
    })
    expect(after.transportDocumentReference).toBe('1500')
  })
})

describe('T1 — error path still echoes the raw input and commits nothing', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render with the raw malformed amount and no commit', async () => {
    const { after, view } = await drive(syntheticCurrencyPost, {
      payload: { syntheticAmount: '£1,5x0' }
    })
    expect(view.context.value).toBe('£1,5x0')
    expect(view.context.errors).toHaveProperty('syntheticAmount')
    expect(after.syntheticAmount).toBeUndefined()
  })
})
