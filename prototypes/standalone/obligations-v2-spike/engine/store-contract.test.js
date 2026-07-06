import { beforeEach, describe, expect, it } from 'vitest'
import { store, IN_PROGRESS, SUBMITTED } from './store.js'

/**
 * SAFETY-NET (NW-4 step 1) — pins the clone/freeze/unknown-id contract of the
 * durable store that no existing unit test drives directly. `contract.test.js`
 * and `store-ops.test.js` already exercise `store` THROUGH the facade; this pins
 * the boundary guarantees themselves (deep-clone both ways, the submit freeze,
 * honest unknown-id handling) so the two-port reshape is provably behaviour-
 * preserving. Written against today's `store.js`; stays green after the reshape
 * because the compat shim re-exports the identical surface. `toMatchObject` (not
 * `toEqual`) on the create shape tolerates the additive `userId` field the
 * records port stamps post-reshape without weakening the pinned fields.
 */
describe('store clone/freeze contract', () => {
  beforeEach(() => store.clear())

  it('create() mints a fresh in-progress journey with empty answers', () => {
    const journey = store.create()
    expect(journey).toMatchObject({
      journeyId: expect.any(String),
      status: IN_PROGRESS,
      submittedAt: null,
      answers: {}
    })
  })

  it('get() returns a deep clone — mutating it never mutates stored state', () => {
    const { journeyId } = store.create()
    store.saveAnswers(journeyId, { email: 'a@b.com', nested: { x: 1 } })
    const read = store.get(journeyId)
    read.answers.email = 'HACKED'
    read.answers.nested.x = 999
    expect(store.get(journeyId).answers).toEqual({
      email: 'a@b.com',
      nested: { x: 1 }
    })
  })

  it('saveAnswers() copies the input by value and returns a deep clone', () => {
    const { journeyId } = store.create()
    const input = { list: [{ a: 1 }] }
    const saved = store.saveAnswers(journeyId, input)
    input.list[0].a = 999 // mutate the caller's object after the write
    saved.answers.list = 'HACKED' // mutate the returned clone
    expect(store.get(journeyId).answers).toEqual({ list: [{ a: 1 }] })
  })

  it('freezes on submit — saveAnswers and re-submit both throw once submitted', () => {
    const { journeyId } = store.create()
    store.submit(journeyId)
    expect(() => store.saveAnswers(journeyId, { late: true })).toThrow()
    expect(() => store.submit(journeyId)).toThrow()
  })

  it('flips status to submitted and stamps submittedAt on submit', () => {
    const { journeyId } = store.create()
    const submitted = store.submit(journeyId)
    expect(submitted.status).toBe(SUBMITTED)
    expect(submitted.submittedAt).toEqual(expect.any(String))
  })

  it('treats unknown ids honestly — get undefined, saveAnswers throws', () => {
    expect(store.get('nope')).toBeUndefined()
    expect(() => store.saveAnswers('nope', {})).toThrow(/Unknown journey/)
    expect(store.has('nope')).toBe(false)
  })

  it('has() and clear() reflect membership', () => {
    const { journeyId } = store.create()
    expect(store.has(journeyId)).toBe(true)
    store.clear()
    expect(store.has(journeyId)).toBe(false)
    expect(store.get(journeyId)).toBeUndefined()
  })
})
