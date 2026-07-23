import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler } from '../../engine/test-support.js'
import { dispatchPages } from '../../features/index.js'
import * as state from '../../engine/index.js'
import { compose, maxText, validate } from './index.js'

const fields = compose(maxText('transportDocumentReference', 58))

const commitReference = async (request, h) => {
  const payload = request.payload ?? {}
  const raw = payload.transportDocumentReference ?? ''
  const { value: clean, errors } = validate(fields, payload)
  if (errors) return h.view('reference', { value: raw, errors })
  await state.commit(request, h, {
    transportDocumentReference: clean.transportDocumentReference ?? ''
  })
  return h.redirect('/next')
}

describe('The cleaned value is persisted, not the raw payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should persist the trimmed value, not the surrounding whitespace the user typed', async () => {
    const { after } = await driveHandler(commitReference, {
      payload: { transportDocumentReference: '  GB-DOC-1500  ' }
    })
    expect(after.transportDocumentReference).toBe('GB-DOC-1500')
  })
})

describe('An invalid value echoes the raw input and commits nothing', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render with the raw over-long value and commit nothing', async () => {
    const raw = 'D'.repeat(59)
    const { after, view } = await driveHandler(commitReference, {
      payload: { transportDocumentReference: raw }
    })
    expect(view.context.value).toBe(raw)
    expect(view.context.errors).toHaveProperty('transportDocumentReference')
    expect(after.transportDocumentReference).toBeUndefined()
  })
})
