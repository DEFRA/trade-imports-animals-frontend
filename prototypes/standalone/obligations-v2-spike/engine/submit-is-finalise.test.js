import { beforeEach, describe, expect, it } from 'vitest'
import { commit, submitJourney } from './index.js'
import { records, IN_PROGRESS, SUBMITTED } from './persistence/records.js'
import { configureReadyForQuote } from './read.js'
import { stubH, journeyRequest } from './test-support.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('submit is finalise', () => {
  beforeEach(() => {
    records.clear()
    journeyId = records.create().journeyId
  })

  it('Should flip to submitted, keep answers byte-equal, and freeze further writes', () => {
    configureReadyForQuote(() => true)
    commit(buildRequest(), stubH(), { email: 'a@b.com' })
    const committed = records.load({ journeyId }).answers

    const result = submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(true)
    expect(result.journey.status).toBe(SUBMITTED)
    expect(result.journey.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.journey.answers).toEqual(committed)
    expect(() => commit(buildRequest(), stubH(), { late: true })).toThrow(
      /is submitted — writes blocked/
    )
  })

  it('Should be a no-op when not ready — journey stays in-progress', () => {
    configureReadyForQuote(() => false)
    commit(buildRequest(), stubH(), { email: 'a@b.com' })

    const result = submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(false)
    expect(records.load({ journeyId }).status).toBe(IN_PROGRESS)
  })
})
