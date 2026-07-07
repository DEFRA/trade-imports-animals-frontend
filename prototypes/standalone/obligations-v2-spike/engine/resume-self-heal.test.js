import { beforeEach, describe, expect, it } from 'vitest'
import { resume } from './index.js'
import { records } from './persistence/records.js'
import { STUB_USER } from './persistence/session.js'
import { configureReadyForQuote } from './read.js'
import { recordingH } from './test-support.js'

describe('resume self-heal (nothing derived is stored)', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
  })

  it('Should re-derive scope on resume, excluding a now-out-of-scope obligation', () => {
    const { journeyId } = records.create({ userId: STUB_USER })
    records.saveAnswers(journeyId, {
      email: 'a@b.com',
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    })

    const result = resume({ state: {}, headers: {} }, recordingH())

    expect(result.scope.has('claims')).toBe(false)
    expect(result.scope.has('email')).toBe(true)
  })

  it('Should store only the canonical record fields — nothing derived is persisted', () => {
    const { journeyId } = records.create({ userId: STUB_USER })
    records.saveAnswers(journeyId, { hadClaims: 'no', claims: [{ x: 1 }] })

    const result = resume({ state: {}, headers: {} }, recordingH())

    expect(Object.keys(result.journey).sort()).toEqual([
      'answers',
      'journeyId',
      'status',
      'submittedAt',
      'userId'
    ])
  })
})
