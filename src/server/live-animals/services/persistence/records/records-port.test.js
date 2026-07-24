import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './stub.js'
import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../engine/persistence/records.js'
import { countryOfOrigin } from '../../../model/obligations/obligations.js'

const originFulfilment = (value) => ({ [countryOfOrigin.id]: value })

describe('records durable port', () => {
  beforeEach(() => records.clear())

  it('Should accept the composite owner and keep carrying its sub as userId', async () => {
    const journey = await records.create({
      owner: { sub: 'user-A', organisation: 'organisation-A' }
    })

    expect(journey).toMatchObject({ userId: 'user-A', status: DRAFT })
  })

  it('Should mint a record stamped with its user and index it by user', async () => {
    const journey = await records.create({ userId: 'user-A' })
    expect(journey).toMatchObject({ userId: 'user-A', status: DRAFT })
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
    expect((await records.load({ journeyId })).status).toBe(DRAFT)
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

  it('Should unfreeze on amend — status set to amend, submittedAt cleared, writes permitted', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.finalise(journeyId)

    const amended = await records.amend(journeyId)

    expect(amended.status).toBe(AMEND)
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

  it('Should cancel an amendment by restoring the submitted snapshot and freezing it again', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    const submitted = await records.finalise(journeyId)
    await records.amend(journeyId)
    await records.replaceFulfilment(journeyId, originFulfilment('DE'))

    const restored = await records.cancelAmend(journeyId)

    expect(restored).toMatchObject({
      status: SUBMITTED,
      submittedAt: submitted.submittedAt,
      fulfilment: originFulfilment('FR')
    })
    await expect(
      records.replaceFulfilment(journeyId, originFulfilment('NL'))
    ).rejects.toThrow(/is submitted — writes blocked/)
  })

  it('Should reject cancel amendment without an active submitted snapshot', async () => {
    const { journeyId } = await records.create({ userId: 'user-A' })
    await expect(records.cancelAmend(journeyId)).rejects.toThrow(
      /has no amendment snapshot — cannot cancel amendment/
    )
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

  it('Should keep listing session-scoped by requested journey ids, not owner', async () => {
    const owner = { sub: 'user-A', organisation: 'organisation-A' }
    const first = await records.create({ owner })
    const second = await records.create({ owner })
    await records.create({ owner })

    const listed = await records.list({
      journeyIds: [second.journeyId, 'GBN-AG-26-000000', first.journeyId],
      owner
    })

    expect(listed.rows.map((journey) => journey.journeyId)).toEqual([
      second.journeyId,
      first.journeyId
    ])
    expect(listed).toMatchObject({
      page: 1,
      size: 20,
      totalElements: 2,
      totalPages: 1
    })
  })

  it('Should list nothing for an empty id set', async () => {
    const owner = { sub: 'user-A', organisation: 'organisation-A' }
    await records.create({ owner })
    expect(await records.list({ journeyIds: [], owner })).toEqual({
      rows: [],
      page: 1,
      size: 20,
      totalElements: 0,
      totalPages: 0
    })
    expect(await records.list()).toEqual({
      rows: [],
      page: 1,
      size: 20,
      totalElements: 0,
      totalPages: 0
    })
  })

  it('Should copy source content into one new draft per owner and idempotency key', async () => {
    const owner = { sub: 'user-A', organisation: 'organisation-A' }
    const source = await records.create({ owner })
    await records.replaceFulfilment(source.journeyId, originFulfilment('FR'))

    const first = await records.copy(source.journeyId, owner, 'copy-key')
    const retry = await records.copy(source.journeyId, owner, 'copy-key')
    const deliberateSecond = await records.copy(
      source.journeyId,
      owner,
      'another-key'
    )

    expect(first).toMatchObject({
      status: DRAFT,
      userId: owner.sub,
      fulfilment: originFulfilment('FR')
    })
    expect(first.journeyId).not.toBe(source.journeyId)
    expect(retry.journeyId).toBe(first.journeyId)
    expect(deliberateSecond.journeyId).not.toBe(first.journeyId)
  })

  it('Should scope copy idempotency to the composite owner', async () => {
    const ownerA = { sub: 'user-A', organisation: 'organisation-A' }
    const ownerB = { sub: 'user-B', organisation: 'organisation-B' }
    const sourceA = await records.create({ owner: ownerA })
    const sourceB = await records.create({ owner: ownerB })

    const copyA = await records.copy(sourceA.journeyId, ownerA, 'same-key')
    const copyB = await records.copy(sourceB.journeyId, ownerB, 'same-key')

    expect(copyB.journeyId).not.toBe(copyA.journeyId)
    await expect(
      records.copy(sourceA.journeyId, ownerB, 'wrong-owner-key')
    ).rejects.toThrow(/Unknown journey/)
  })

  it('Should soft-delete idempotently and exclude the journey from lists', async () => {
    const owner = { sub: 'user-A', organisation: 'organisation-A' }
    const journey = await records.create({ owner })

    const deleted = await records.softDelete(journey.journeyId, owner)
    const retry = await records.softDelete(journey.journeyId, owner)

    expect(deleted.status).toBe(DELETED)
    expect(retry.status).toBe(DELETED)
    expect(
      (await records.list({ journeyIds: [journey.journeyId], owner })).rows
    ).toEqual([])
  })
})
