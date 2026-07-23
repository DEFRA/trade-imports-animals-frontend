import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './stub.js'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import { countryOfOrigin } from '../../../model/obligations/obligations.js'

const originFulfilment = (value) => ({ [countryOfOrigin.id]: value })

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

  it('Should mint an empty decoded canonical fulfilment, never answers', async () => {
    const journey = await records.create({ userId: 'user-A' })

    expect(journey.fulfilment).toEqual({})
    expect(journey).not.toHaveProperty('answers')
  })

  it('Should whole-replace canonical fulfilment durably, with no finalise', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    expect((await records.load({ journeyId })).fulfilment).toEqual(
      originFulfilment('FR')
    )
    expect((await records.load({ journeyId })).status).toBe(IN_PROGRESS)
  })

  it('Should replace the whole canonical snapshot, not patch it', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.replaceFulfilment(journeyId, {
      ...originFulfilment('FR'),
      historic: 'first'
    })

    await records.replaceFulfilment(journeyId, originFulfilment('DE'))

    expect((await records.load({ journeyId })).fulfilment).toEqual(
      originFulfilment('DE')
    )
  })

  it('Should freeze after finalise so a later replacement throws', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    await records.finalise(journeyId)
    await expect(
      records.replaceFulfilment(journeyId, { late: true })
    ).rejects.toThrow(/is submitted — writes blocked/)
  })

  it('Should stamp createdAt on create and keep it through the lifecycle', async () => {
    const created = await records.create({ userId: 'user-A' })
    expect(created.createdAt).toEqual(expect.any(String))
    const submitted = await records.finalise(created.journeyId)
    expect(submitted.createdAt).toBe(created.createdAt)
  })

  it('Should unfreeze on amend — status back to in-progress, submittedAt cleared, writes permitted', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.finalise(journeyId)

    const amended = await records.amend(journeyId)

    expect(amended.status).toBe(IN_PROGRESS)
    expect(amended.submittedAt).toBeNull()
    await records.replaceFulfilment(journeyId, originFulfilment('DE'))
    expect((await records.load({ journeyId })).fulfilment).toEqual(
      originFulfilment('DE')
    )
  })

  it('Should re-finalise after an amend — the amend-and-resubmit cycle round-trips', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.finalise(journeyId)
    await records.amend(journeyId)

    const resubmitted = await records.finalise(journeyId)

    expect(resubmitted.status).toBe(SUBMITTED)
    expect(resubmitted.submittedAt).toEqual(expect.any(String))
  })

  it('Should reject amend on a journey that is not submitted', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await expect(records.amend(journeyId)).rejects.toThrow(
      /is not submitted — cannot amend/
    )
  })

  it('Should reject amend on an unknown journey', async () => {
    await expect(records.amend('GBN-AG-26-000000')).rejects.toThrow(
      /Unknown journey/
    )
  })

  it('Should list exactly the requested journeys in order, skipping unknown ids', async () => {
    const first = await records.create({ userId: 'user-A' })
    const second = await records.create({ userId: 'user-A' })
    await records.create({ userId: 'user-A' })

    const listed = await records.list({
      journeyIds: [second.journeyId, 'GBN-AG-26-000000', first.journeyId]
    })

    expect(listed.map((journey) => journey.journeyId)).toEqual([
      second.journeyId,
      first.journeyId
    ])
  })

  it('Should list nothing for an empty id set', async () => {
    await records.create({ userId: 'user-A' })
    expect(await records.list({ journeyIds: [] })).toEqual([])
    expect(await records.list()).toEqual([])
  })
})
