import { beforeEach, describe, expect, it } from 'vitest'
import { resume } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { STUB_USER, JOURNEY_COOKIE } from './persistence/session.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { recordingH } from './test-support.js'

describe('resume by user (cookieless)', () => {
  beforeEach(() => {
    configureRecords(recordsStub)
    records.clear()
    configureReadyForCheckYourAnswers(() => false)
  })

  it('Should recover a saved journey with no cookie, rebuild scope, and re-pin it', () => {
    const { journeyId } = records.create({ userId: STUB_USER })
    records.saveAnswers(journeyId, { countryOfOrigin: 'FR' })

    const h = recordingH()
    const result = resume({ state: {}, headers: {} }, h)

    expect(result.journey.journeyId).toBe(journeyId)
    expect(result.answers).toEqual({ countryOfOrigin: 'FR' })
    expect(result.scope.has('countryOfOrigin')).toBe(true)
    expect(h.calls).toContainEqual([JOURNEY_COOKIE, journeyId])
  })

  it('Should mint a fresh journey when the user has none to resume', () => {
    const h = recordingH()
    const result = resume({ state: {}, headers: {} }, h)
    expect(result.journey.journeyId).toEqual(expect.any(String))
    expect(records.load({ userId: STUB_USER }).journeyId).toBe(
      result.journey.journeyId
    )
  })
})
