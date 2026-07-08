import { beforeEach, describe, expect, it } from 'vitest'
import { records, IN_PROGRESS } from './records.js'

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
    records.saveAnswers(journeyId, { countryOfOrigin: 'FR' })
    expect(records.load({ journeyId }).answers).toEqual({
      countryOfOrigin: 'FR'
    })
    expect(records.load({ journeyId }).status).toBe(IN_PROGRESS)
  })

  it('Should freeze after finalise so a later saveAnswers throws', () => {
    const { journeyId } = records.create({ userId: 'user-A' })
    records.saveAnswers(journeyId, { countryOfOrigin: 'FR' })
    records.finalise(journeyId)
    expect(() => records.saveAnswers(journeyId, { late: true })).toThrow(
      /is submitted — writes blocked/
    )
  })
})
