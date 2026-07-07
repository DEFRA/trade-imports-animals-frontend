import { beforeEach, describe, expect, it } from 'vitest'
import { commit, submitJourney } from './index.js'
import { records, IN_PROGRESS, SUBMITTED } from './persistence/records.js'
import { configureReadyForQuote } from './read.js'
import { stubH, journeyRequest } from './test-support.js'

/**
 * NW-4 shape proof — SUBMIT IS FINALISE. Because durable answers land on every
 * commit (write-through), submit is a pure status flip: it stamps
 * `submittedAt`, writes NO answers (byte-equal to the last commit), and freezes
 * the record (a later commit throws). A not-ready submit is a no-op that leaves
 * the journey in-progress. `readyForQuote` is stubbed to drive both branches
 * deterministically — the readiness computation itself is tested in the flow.
 */
let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('submit is finalise', () => {
  beforeEach(() => {
    records.clear()
    journeyId = records.create().journeyId
  })

  it('flips to submitted, keeps answers byte-equal, and freezes further writes', () => {
    configureReadyForQuote(() => true)
    commit(buildRequest(), stubH(), { email: 'a@b.com' })
    const committed = records.load({ journeyId }).answers

    const result = submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(true)
    expect(result.journey.status).toBe(SUBMITTED)
    expect(result.journey.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    // finalise writes NO data — answers are exactly the last commit.
    expect(result.journey.answers).toEqual(committed)
    // the record is frozen — a later commit is rejected.
    expect(() => commit(buildRequest(), stubH(), { late: true })).toThrow()
  })

  it('is a no-op when not ready — journey stays in-progress', () => {
    configureReadyForQuote(() => false)
    commit(buildRequest(), stubH(), { email: 'a@b.com' })

    const result = submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(false)
    expect(records.load({ journeyId }).status).toBe(IN_PROGRESS)
  })
})
