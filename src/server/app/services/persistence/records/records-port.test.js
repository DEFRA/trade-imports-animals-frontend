import { beforeEach, describe, expect, it } from 'vitest'
import { records } from './stub/index.js'
import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../engine/persistence/records.js'
import { obligationSet } from '../../../model/obligations/manifest.js'

const { countryOfOrigin } = obligationSet()

const originFulfilment = (value) => ({ [countryOfOrigin.id]: value })

const UNKNOWN_JOURNEY_ID = 'GBN-AG-26-000000'

describe('records durable port', () => {
  beforeEach(() => records.clear())

  it('Should mint a GBN-AG-YY-XXXXXX reference as the journeyId', async () => {
    const { journeyId } = await records.create()
    const year = String(new Date().getFullYear() % 100).padStart(2, '0')
    expect(journeyId).toMatch(
      new RegExp(`^GBN-AG-${year}-[0-9A-HJKMNP-TV-Z]{6}$`)
    )
  })

  it('Should mint a distinct reference per journey', async () => {
    const first = await records.create()
    const second = await records.create()
    expect(second.journeyId).not.toBe(first.journeyId)
  })

  it('Should resolve load by journeyId', async () => {
    const { journeyId } = await records.create()
    expect((await records.load({ journeyId })).journeyId).toBe(journeyId)
  })

  it('Should mint an empty decoded canonical fulfilment, never answers', async () => {
    const journey = await records.create()

    expect(journey.fulfilment).toEqual({})
    expect(journey).not.toHaveProperty('answers')
  })

  it('Should whole-replace canonical fulfilment durably, with no finalise', async () => {
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    expect((await records.load({ journeyId })).fulfilment).toEqual(
      originFulfilment('FR')
    )
    expect((await records.load({ journeyId })).status).toBe(DRAFT)
  })

  it('Should replace the whole canonical snapshot, not patch it', async () => {
    const { journeyId } = await records.create()
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
    const { journeyId } = await records.create()
    await records.replaceFulfilment(journeyId, originFulfilment('FR'))
    await records.finalise(journeyId)
    await expect(
      records.replaceFulfilment(journeyId, { late: true })
    ).rejects.toThrow(/is submitted — writes blocked/)
  })

  it('Should stamp createdAt on create and keep it through the lifecycle', async () => {
    const created = await records.create()
    expect(created.createdAt).toEqual(expect.any(String))
    const submitted = await records.finalise(created.journeyId)
    expect(submitted.createdAt).toBe(created.createdAt)
  })

  it('Should unfreeze on amend — status set to amend, submittedAt cleared, writes permitted', async () => {
    const { journeyId } = await records.create()
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
    const { journeyId } = await records.create()
    await records.finalise(journeyId)
    await records.amend(journeyId)

    const resubmitted = await records.finalise(journeyId)

    expect(resubmitted.status).toBe(SUBMITTED)
    expect(resubmitted.submittedAt).toEqual(expect.any(String))
  })

  it('Should cancel an amendment by restoring the submitted snapshot and freezing it again', async () => {
    const { journeyId } = await records.create()
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
    const { journeyId } = await records.create()
    await expect(records.cancelAmend(journeyId)).rejects.toThrow(
      /has no amendment snapshot — cannot cancel amendment/
    )
  })

  it('Should reject amend on a journey that is not submitted', async () => {
    const { journeyId } = await records.create()
    await expect(records.amend(journeyId)).rejects.toThrow(
      /is not submitted — cannot amend/
    )
  })

  it('Should reject amend on an unknown journey', async () => {
    await expect(records.amend(UNKNOWN_JOURNEY_ID)).rejects.toThrow(
      /Unknown journey/
    )
  })

  it('Should keep listing session-scoped by requested journey ids', async () => {
    const first = await records.create()
    const second = await records.create()
    await records.create()

    const listed = await records.list({
      journeyIds: [second.journeyId, UNKNOWN_JOURNEY_ID, first.journeyId]
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

  it('Should list only an exact requested reference', async () => {
    const first = await records.create()
    const second = await records.create()

    const matched = await records.list({
      journeyIds: [first.journeyId, second.journeyId],
      referenceNumber: second.journeyId
    })
    const missing = await records.list({
      journeyIds: [first.journeyId, second.journeyId],
      referenceNumber: 'GBN-AG-26-ZZZZZZ'
    })

    expect(matched.rows.map((journey) => journey.journeyId)).toEqual([
      second.journeyId
    ])
    expect(matched.totalElements).toBe(1)
    expect(missing.rows).toEqual([])
    expect(missing.totalElements).toBe(0)
  })

  it('Should list nothing for an empty id set', async () => {
    await records.create()
    expect(await records.list({ journeyIds: [] })).toEqual({
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

  it('Should copy source content into one new draft per idempotency key', async () => {
    const source = await records.create()
    await records.replaceFulfilment(source.journeyId, originFulfilment('FR'))

    const first = await records.copy(source.journeyId, 'copy-key')
    const retry = await records.copy(source.journeyId, 'copy-key')
    const deliberateSecond = await records.copy(source.journeyId, 'another-key')

    expect(first).toMatchObject({
      status: DRAFT,
      fulfilment: originFulfilment('FR')
    })
    expect(first.journeyId).not.toBe(source.journeyId)
    expect(retry.journeyId).toBe(first.journeyId)
    expect(deliberateSecond.journeyId).not.toBe(first.journeyId)
  })

  it('Should scope copy idempotency to the source reference', async () => {
    const sourceA = await records.create()
    const sourceB = await records.create()

    const copyA = await records.copy(sourceA.journeyId, 'same-key')
    const copyB = await records.copy(sourceB.journeyId, 'same-key')

    expect(copyB.journeyId).not.toBe(copyA.journeyId)
    await expect(
      records.copy(UNKNOWN_JOURNEY_ID, 'unknown-source-key')
    ).rejects.toThrow(/Unknown journey/)
  })

  it('Should soft-delete idempotently and exclude the journey from lists', async () => {
    const journey = await records.create()

    const deleted = await records.softDelete(journey.journeyId)
    const retry = await records.softDelete(journey.journeyId)

    expect(deleted.status).toBe(DELETED)
    expect(retry.status).toBe(DELETED)
    expect(
      (await records.list({ journeyIds: [journey.journeyId] })).rows
    ).toEqual([])
  })
})
