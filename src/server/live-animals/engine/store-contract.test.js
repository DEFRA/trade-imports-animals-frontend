import { beforeEach, describe, expect, it } from 'vitest'
import { store, IN_PROGRESS, SUBMITTED } from './store.js'
import { configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import {
  countryOfOrigin,
  placeOfOrigin
} from '../model/obligations/obligations.js'

describe('store clone/freeze contract', () => {
  beforeEach(() => {
    configureRecords(recordsStub)
    store.clear()
  })

  it('Should be a frozen surface — methods cannot be reassigned', () => {
    expect(Object.isFrozen(store)).toBe(true)
  })

  it('Should mint a fresh in-progress journey with empty canonical fulfilment', async () => {
    const journey = await store.create()
    expect(journey).toMatchObject({
      journeyId: expect.any(String),
      status: IN_PROGRESS,
      submittedAt: null,
      fulfilment: {},
      answers: {}
    })
  })

  it('Should return a deep clone from get — mutating it never mutates stored state', async () => {
    const { journeyId } = await store.create()
    await store.replaceFulfilment(journeyId, {
      [countryOfOrigin.id]: 'FR',
      [placeOfOrigin.id]: { name: 'Farm', address: { country: 'FR' } }
    })
    const read = await store.get(journeyId)
    read.fulfilment[countryOfOrigin.id] = 'HACKED'
    read.fulfilment[placeOfOrigin.id].address.country = 'HACKED'
    expect((await store.get(journeyId)).fulfilment).toEqual({
      [countryOfOrigin.id]: 'FR',
      [placeOfOrigin.id]: { name: 'Farm', address: { country: 'FR' } }
    })
  })

  it('Should copy canonical input by value and return a deep clone', async () => {
    const { journeyId } = await store.create()
    const input = {
      [placeOfOrigin.id]: { name: 'Farm', address: { country: 'FR' } }
    }
    const saved = await store.replaceFulfilment(journeyId, input)
    input[placeOfOrigin.id].address.country = 'HACKED'
    saved.fulfilment[placeOfOrigin.id] = 'HACKED'
    expect((await store.get(journeyId)).fulfilment).toEqual({
      [placeOfOrigin.id]: { name: 'Farm', address: { country: 'FR' } }
    })
  })

  it('Should freeze on submit — replace and re-submit both throw once submitted', async () => {
    const { journeyId } = await store.create()
    await store.submit(journeyId)
    await expect(
      store.replaceFulfilment(journeyId, { late: true })
    ).rejects.toThrow(/is submitted — writes blocked/)
    await expect(store.submit(journeyId)).rejects.toThrow(
      /is submitted — writes blocked/
    )
  })

  it('Should flip status to submitted and stamp submittedAt on submit', async () => {
    const { journeyId } = await store.create()
    const submitted = await store.submit(journeyId)
    expect(submitted.status).toBe(SUBMITTED)
    expect(submitted.submittedAt).toEqual(expect.any(String))
  })

  it('Should treat unknown ids honestly — get undefined, replace throws', async () => {
    expect(await store.get('nope')).toBeUndefined()
    await expect(store.replaceFulfilment('nope', {})).rejects.toThrow(
      /Unknown journey/
    )
    expect(await store.has('nope')).toBe(false)
  })

  it('Should reflect membership via has() and clear()', async () => {
    const { journeyId } = await store.create()
    expect(await store.has(journeyId)).toBe(true)
    await store.clear()
    expect(await store.has(journeyId)).toBe(false)
    expect(await store.get(journeyId)).toBeUndefined()
  })
})
