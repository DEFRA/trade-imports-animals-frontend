import { beforeEach, describe, expect, it } from 'vitest'
import { records, IN_PROGRESS } from './records.js'

/**
 * NW-4 shape proof — the RECORDS (durable) port in isolation. Pins the additions
 * the reshape made over today's store body: a `userId` stamp, the `byUser` index
 * behind polymorphic `load({ userId })`, and that the clone/freeze contract the
 * safety-net pinned on the shim survives on the port itself (`saveAnswers` is
 * durable with NO finalise; a post-`finalise` write throws).
 */
describe('records durable port', () => {
  beforeEach(() => records.clear())

  it('Should mint a record stamped with its user and index it by user', () => {
    const journey = records.create({ userId: 'user-A' })
    expect(journey).toMatchObject({ userId: 'user-A', status: IN_PROGRESS })
    expect(records.load({ userId: 'user-A' }).journeyId).toBe(journey.journeyId)
  })

  it('Should resolve load polymorphically by journeyId or by userId', () => {
    const { journeyId } = records.create({ userId: 'user-A' })
    expect(records.load({ journeyId }).journeyId).toBe(journeyId)
    expect(records.load({ userId: 'user-A' }).journeyId).toBe(journeyId)
  })

  it('Should return undefined from load for an unknown user', () => {
    records.create({ userId: 'user-A' })
    expect(records.load({ userId: 'nobody' })).toBeUndefined()
  })

  it('Should make saveAnswers durable immediately, with no finalise', () => {
    const { journeyId } = records.create({ userId: 'user-A' })
    records.saveAnswers(journeyId, { email: 'a@b.com' })
    expect(records.load({ journeyId }).answers).toEqual({ email: 'a@b.com' })
    expect(records.load({ journeyId }).status).toBe(IN_PROGRESS)
  })

  it('Should freeze after finalise so a later saveAnswers throws', () => {
    const { journeyId } = records.create({ userId: 'user-A' })
    records.saveAnswers(journeyId, { email: 'a@b.com' })
    records.finalise(journeyId)
    expect(() => records.saveAnswers(journeyId, { late: true })).toThrow(
      /is submitted — writes blocked/
    )
  })
})
