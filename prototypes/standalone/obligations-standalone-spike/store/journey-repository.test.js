import { describe, it, expect } from 'vitest'
import {
  createJourneyRepository,
  IN_PROGRESS,
  SUBMITTED
} from './journey-repository.js'

const tickingClock = () => {
  let tick = 0
  return () => `2026-07-02T10:0${tick++}:00.000Z`
}

describe('store/journey-repository — the persistence seam', () => {
  it('creates the minimal 7-key envelope, in progress with no submittedAt', () => {
    const repository = createJourneyRepository({ now: tickingClock() })
    const journey = repository.create('car-insurance-quote-flow')
    expect(Object.keys(journey).sort()).toEqual([
      'createdAt',
      'flowId',
      'fulfilments',
      'journeyId',
      'status',
      'submittedAt',
      'updatedAt'
    ])
    expect(journey).toMatchObject({
      flowId: 'car-insurance-quote-flow',
      status: IN_PROGRESS,
      submittedAt: null,
      fulfilments: {},
      createdAt: '2026-07-02T10:00:00.000Z',
      updatedAt: '2026-07-02T10:00:00.000Z'
    })
    expect(repository.get(journey.journeyId)).toEqual(journey)
    expect(repository.has(journey.journeyId)).toBe(true)
  })

  it('returns undefined for an unknown journey and throws on unknown writes', () => {
    const repository = createJourneyRepository()
    expect(repository.get('nope')).toBeUndefined()
    expect(repository.has('nope')).toBe(false)
    expect(() => repository.saveFulfilments('nope', {})).toThrow(
      /Unknown journey/
    )
    expect(() => repository.submit('nope')).toThrow(/Unknown journey/)
  })

  it('saveFulfilments replaces only the fulfilments and bumps updatedAt', () => {
    const repository = createJourneyRepository({ now: tickingClock() })
    const created = repository.create('flow')
    const saved = repository.saveFulfilments(created.journeyId, {
      'id-a': { value: 'hello' }
    })
    expect(saved.fulfilments).toEqual({ 'id-a': { value: 'hello' } })
    expect(saved.updatedAt).toBe('2026-07-02T10:01:00.000Z')
    expect(saved).toMatchObject({
      journeyId: created.journeyId,
      flowId: created.flowId,
      status: IN_PROGRESS,
      createdAt: created.createdAt,
      submittedAt: null
    })
  })

  it('deep-copies both ways — no caller can mutate stored state by reference', () => {
    const repository = createJourneyRepository()
    const journey = repository.create('flow')
    journey.fulfilments['id-a'] = { value: 'leaked' }
    expect(repository.get(journey.journeyId).fulfilments).toEqual({})

    const passed = { 'id-a': { value: ['one'] } }
    repository.saveFulfilments(journey.journeyId, passed)
    passed['id-a'].value.push('mutated')
    expect(repository.get(journey.journeyId).fulfilments['id-a'].value).toEqual(
      ['one']
    )

    repository.get(journey.journeyId).fulfilments['id-a'].value.push('again')
    expect(repository.get(journey.journeyId).fulfilments['id-a'].value).toEqual(
      ['one']
    )
  })

  it('submit is the one-way flip: stamps submittedAt and freezes the document', () => {
    const repository = createJourneyRepository({ now: tickingClock() })
    const journey = repository.create('flow')
    const submitted = repository.submit(journey.journeyId)
    expect(submitted.status).toBe(SUBMITTED)
    expect(submitted.submittedAt).toBe('2026-07-02T10:01:00.000Z')
    expect(submitted.updatedAt).toBe(submitted.submittedAt)

    expect(() => repository.submit(journey.journeyId)).toThrow(
      /writes are blocked/
    )
    expect(() =>
      repository.saveFulfilments(journey.journeyId, { 'id-a': { value: 'x' } })
    ).toThrow(/writes are blocked/)
    expect(repository.get(journey.journeyId)).toEqual(submitted)
  })

  it('clear wipes every stored journey (test hygiene)', () => {
    const repository = createJourneyRepository()
    const journey = repository.create('flow')
    repository.clear()
    expect(repository.has(journey.journeyId)).toBe(false)
  })
})
