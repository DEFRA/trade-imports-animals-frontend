import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './stub.js'
import { IN_PROGRESS } from '../../../engine/persistence/records.js'

describe('records durable port', () => {
  beforeEach(() => records.clear())

  it('Should mint a record stamped with its user and index it by user', async () => {
    const journey = await records.create({ userId: 'user-A' })
    expect(journey).toMatchObject({ userId: 'user-A', status: IN_PROGRESS })
    expect((await records.load({ userId: 'user-A' })).journeyId).toBe(
      journey.journeyId
    )
  })

  it('Should mint a GBN-AG-YY-XXXXXX reference as the journeyId', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    const year = String(new Date().getFullYear() % 100).padStart(2, '0')
    expect(journeyId).toMatch(
      new RegExp(`^GBN-AG-${year}-[0-9A-HJKMNP-TV-Z]{6}$`)
    )
  })

  it('Should mint a distinct reference per journey', async () => {
    const first = await records.create({ userId: 'user-A' })
    const second = await records.create({ userId: 'user-B' })
    expect(second.journeyId).not.toBe(first.journeyId)
  })

  it('Should resolve load polymorphically by journeyId or by userId', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    expect((await records.load({ journeyId })).journeyId).toBe(journeyId)
    expect((await records.load({ userId: 'user-A' })).journeyId).toBe(journeyId)
  })

  it('Should return undefined from load for an unknown user', async () => {
    await records.create({ userId: 'user-A' })
    expect(await records.load({ userId: 'nobody' })).toBeUndefined()
  })

  it('Should make saveAnswers durable immediately, with no finalise', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.saveAnswers(journeyId, { countryOfOrigin: 'FR' })
    expect((await records.load({ journeyId })).answers).toEqual({
      countryOfOrigin: 'FR'
    })
    expect((await records.load({ journeyId })).status).toBe(IN_PROGRESS)
  })

  it('Should freeze after finalise so a later saveAnswers throws', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.saveAnswers(journeyId, { countryOfOrigin: 'FR' })
    await records.finalise(journeyId)
    await expect(
      records.saveAnswers(journeyId, { late: true })
    ).rejects.toThrow(/is submitted — writes blocked/)
  })
})
