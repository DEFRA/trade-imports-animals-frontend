import { beforeEach, describe, expect, it } from 'vitest'
import { resume } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureSession, STUB_USER } from './persistence/session.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { recordingH } from './test-support.js'

describe('resume self-heal (nothing derived is stored)', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
  })

  it('Should re-derive scope on resume, excluding a now-out-of-scope obligation', async () => {
    const { journeyId } = await records.create({ userId: STUB_USER })
    await records.saveAnswers(journeyId, {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no',
      regionOfOriginCode: 'FR-75'
    })

    const result = await resume({ state: {}, headers: {} }, recordingH())

    expect(result.scope.has('regionOfOriginCode')).toBe(false)
    expect(result.scope.has('countryOfOrigin')).toBe(true)
  })

  it('Should store only the canonical record fields — nothing derived is persisted', async () => {
    const { journeyId } = await records.create({ userId: STUB_USER })
    await records.saveAnswers(journeyId, { countryOfOrigin: 'FR' })

    const result = await resume({ state: {}, headers: {} }, recordingH())

    expect(Object.keys(result.journey).sort()).toEqual([
      'answers',
      'journeyId',
      'status',
      'submittedAt',
      'userId'
    ])
  })
})
