import { beforeEach, describe, expect, it } from 'vitest'
import { store, IN_PROGRESS, SUBMITTED } from './store.js'
import { configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'

describe('store clone/freeze contract', () => {
  beforeEach(() => {
    configureRecords(recordsStub)
    store.clear()
  })

  it('Should be a frozen surface — methods cannot be reassigned', () => {
    expect(Object.isFrozen(store)).toBe(true)
  })

  it('Should mint a fresh in-progress journey with empty answers', async () => {
    const journey = await store.create()
    expect(journey).toMatchObject({
      journeyId: expect.any(String),
      status: IN_PROGRESS,
      submittedAt: null,
      answers: {}
    })
  })

  it('Should return a deep clone from get — mutating it never mutates stored state', async () => {
    const { journeyId } = await store.create()
    await store.saveAnswers(journeyId, {
      countryOfOrigin: 'FR',
      nested: { x: 1 }
    })
    const read = await store.get(journeyId)
    read.answers.countryOfOrigin = 'HACKED'
    read.answers.nested.x = 999
    expect((await store.get(journeyId)).answers).toEqual({
      countryOfOrigin: 'FR',
      nested: { x: 1 }
    })
  })

  it('Should copy the input by value and return a deep clone from saveAnswers', async () => {
    const { journeyId } = await store.create()
    const input = { list: [{ a: 1 }] }
    const saved = await store.saveAnswers(journeyId, input)
    input.list[0].a = 999
    saved.answers.list = 'HACKED'
    expect((await store.get(journeyId)).answers).toEqual({ list: [{ a: 1 }] })
  })

  it('Should freeze on submit — saveAnswers and re-submit both throw once submitted', async () => {
    const { journeyId } = await store.create()
    await store.submit(journeyId)
    await expect(store.saveAnswers(journeyId, { late: true })).rejects.toThrow(
      /is submitted — writes blocked/
    )
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

  it('Should treat unknown ids honestly — get undefined, saveAnswers throws', async () => {
    expect(await store.get('nope')).toBeUndefined()
    await expect(store.saveAnswers('nope', {})).rejects.toThrow(
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
