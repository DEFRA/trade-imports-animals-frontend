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

  it('Should mint a fresh in-progress journey with empty answers', () => {
    const journey = store.create()
    expect(journey).toMatchObject({
      journeyId: expect.any(String),
      status: IN_PROGRESS,
      submittedAt: null,
      answers: {}
    })
  })

  it('Should return a deep clone from get — mutating it never mutates stored state', () => {
    const { journeyId } = store.create()
    store.saveAnswers(journeyId, { countryOfOrigin: 'FR', nested: { x: 1 } })
    const read = store.get(journeyId)
    read.answers.countryOfOrigin = 'HACKED'
    read.answers.nested.x = 999
    expect(store.get(journeyId).answers).toEqual({
      countryOfOrigin: 'FR',
      nested: { x: 1 }
    })
  })

  it('Should copy the input by value and return a deep clone from saveAnswers', () => {
    const { journeyId } = store.create()
    const input = { list: [{ a: 1 }] }
    const saved = store.saveAnswers(journeyId, input)
    input.list[0].a = 999
    saved.answers.list = 'HACKED'
    expect(store.get(journeyId).answers).toEqual({ list: [{ a: 1 }] })
  })

  it('Should freeze on submit — saveAnswers and re-submit both throw once submitted', () => {
    const { journeyId } = store.create()
    store.submit(journeyId)
    expect(() => store.saveAnswers(journeyId, { late: true })).toThrow(
      /is submitted — writes blocked/
    )
    expect(() => store.submit(journeyId)).toThrow(
      /is submitted — writes blocked/
    )
  })

  it('Should flip status to submitted and stamp submittedAt on submit', () => {
    const { journeyId } = store.create()
    const submitted = store.submit(journeyId)
    expect(submitted.status).toBe(SUBMITTED)
    expect(submitted.submittedAt).toEqual(expect.any(String))
  })

  it('Should treat unknown ids honestly — get undefined, saveAnswers throws', () => {
    expect(store.get('nope')).toBeUndefined()
    expect(() => store.saveAnswers('nope', {})).toThrow(/Unknown journey/)
    expect(store.has('nope')).toBe(false)
  })

  it('Should reflect membership via has() and clear()', () => {
    const { journeyId } = store.create()
    expect(store.has(journeyId)).toBe(true)
    store.clear()
    expect(store.has(journeyId)).toBe(false)
    expect(store.get(journeyId)).toBeUndefined()
  })
})
