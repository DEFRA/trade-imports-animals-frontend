import { beforeEach, describe, expect, it } from 'vitest'
import { records, IN_PROGRESS } from './persistence/records.js'

/**
 * NW-4 shape proof — the RECORDS (durable) port in isolation. Pins the additions
 * the reshape made over today's store body: a `userId` stamp, the `byUser` index
 * behind polymorphic `load({ userId })`, and that the clone/freeze contract the
 * safety-net pinned on the shim survives on the port itself (`saveAnswers` is
 * durable with NO finalise; a post-`finalise` write throws).
 */
describe('records durable port', () => {
  beforeEach(() => records.clear())

  it('mints a record stamped with its user and indexes it by user', () => {
    const journey = records.create({ userId: 'user-A' })
    expect(journey).toMatchObject({ userId: 'user-A', status: IN_PROGRESS })
    expect(records.load({ userId: 'user-A' }).journeyId).toBe(journey.journeyId)
  })

  it('load resolves polymorphically by journeyId OR by userId', () => {
    const { journeyId } = records.create({ userId: 'user-A' })
    expect(records.load({ journeyId }).journeyId).toBe(journeyId)
    expect(records.load({ userId: 'user-A' }).journeyId).toBe(journeyId)
  })

  it('load by an unknown user returns undefined', () => {
    records.create({ userId: 'user-A' })
    expect(records.load({ userId: 'nobody' })).toBeUndefined()
  })

  it('saveAnswers is durable immediately, with no finalise', () => {
    const { journeyId } = records.create({ userId: 'user-A' })
    records.saveAnswers(journeyId, { email: 'a@b.com' })
    expect(records.load({ journeyId }).answers).toEqual({ email: 'a@b.com' })
    expect(records.load({ journeyId }).status).toBe(IN_PROGRESS)
  })

  it('freezes after finalise — a later saveAnswers throws', () => {
    const { journeyId } = records.create({ userId: 'user-A' })
    records.saveAnswers(journeyId, { email: 'a@b.com' })
    records.finalise(journeyId)
    expect(() => records.saveAnswers(journeyId, { late: true })).toThrow()
  })
})
