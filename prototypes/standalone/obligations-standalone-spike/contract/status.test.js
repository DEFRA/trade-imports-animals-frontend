import { describe, it, expect } from 'vitest'
import {
  canSubmit,
  evaluate,
  journeyFlow,
  journeyModel,
  journeyState,
  obligationStateOver,
  pageById,
  sectionOfPage
} from './status.js'
import { createJourneyRepository } from '../store/index.js'

const REFERENCE_ID_LENGTH = 6

const { identifiers } = journeyModel()
const id = (name) => identifiers.idOf(name)

const byName = (values) =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [id(name), { value }])
  )

const setup = (values) => {
  const repository = createJourneyRepository()
  let journey = repository.create(journeyFlow().id)
  if (values) {
    journey = repository.saveFulfilments(journey.journeyId, byName(values))
  }
  return { repository, journey }
}

/** Every engine-mandatory obligation satisfied (hadClaims 'no' path). */
const COMPLETE = {
  email: 'sam@example.com',
  fullName: 'Alex Driver',
  registration: 'AB12CDE',
  hadClaims: 'no',
  coverType: 'comprehensive',
  extras: [],
  addons: []
}

describe('contract/status — the evaluation spine', () => {
  it('pins the exact evaluation key set, deep-frozen', () => {
    const { journey } = setup()
    const evaluation = evaluate(journey)
    expect(Object.keys(evaluation).sort()).toEqual([
      'canSubmit',
      'containerStatuses',
      'drops',
      'fulfilments',
      'journeyId',
      'journeyState',
      'obligations',
      'reference',
      'submitted',
      'submittedAt'
    ])
    expect(Object.isFrozen(evaluation)).toBe(true)
    expect(Object.isFrozen(evaluation.obligations)).toBe(true)
    expect(() => {
      evaluation.canSubmit = true
    }).toThrow(TypeError)
  })

  it('a fresh journey is Not Started with gated Containers Not Applicable', () => {
    const { journey } = setup()
    const evaluation = evaluate(journey)
    expect(evaluation.journeyState).toBe('notStarted')
    expect(journeyState(evaluation)).toBe('notStarted')
    expect(canSubmit(evaluation)).toBe(false)
    expect(evaluation.submitted).toBe(false)
    expect(evaluation.submittedAt).toBeNull()
    expect(evaluation.containerStatuses.pages['about-you']).toBe('notStarted')
    expect(evaluation.containerStatuses.pages.claims).toBe('notApplicable')
    expect(evaluation.containerStatuses.groups['get-your-quote']).toBe(
      'notApplicable'
    )
  })

  it('an optional-only answer moves the journey to In Progress', () => {
    const { journey } = setup({ yearsNoClaims: '5' })
    const evaluation = evaluate(journey)
    expect(evaluation.containerStatuses.pages['driving-history']).toBe(
      'inProgress'
    )
    expect(evaluation.journeyState).toBe('inProgress')
  })

  it('every engine-mandatory answer makes the journey Fulfilled and submittable', () => {
    const { journey } = setup(COMPLETE)
    const evaluation = evaluate(journey)
    expect(evaluation.journeyState).toBe('fulfilled')
    expect(canSubmit(evaluation)).toBe(true)
    expect(evaluation.containerStatuses.groups['your-driving-and-cover']).toBe(
      'fulfilled'
    )
  })

  it('a submitted journey reads Submitted and can never re-submit', () => {
    const { repository, journey } = setup(COMPLETE)
    repository.submit(journey.journeyId)
    const evaluation = evaluate(repository.get(journey.journeyId))
    expect(evaluation.journeyState).toBe('submitted')
    expect(evaluation.submitted).toBe(true)
    expect(evaluation.submittedAt).toEqual(expect.any(String))
    expect(canSubmit(evaluation)).toBe(false)
  })

  it('carries the deterministic quote reference for its journeyId', () => {
    const { journey } = setup()
    const expected = `CI-${journey.journeyId.replace(/-/g, '').slice(0, REFERENCE_ID_LENGTH).toUpperCase()}`
    expect(evaluate(journey).reference).toBe(expected)
    expect(evaluate(journey)).toEqual(evaluate(journey))
  })

  it('surfaces prune drops and hands back the amended fulfilments', () => {
    const { repository, journey } = setup()
    const stored = repository.saveFulfilments(journey.journeyId, {
      ...byName({ fullName: 'Alex Driver' }),
      'id-no-longer-in-model': { value: 'stale' }
    })
    const evaluation = evaluate(stored)
    expect(evaluation.drops).toContainEqual({
      obligationId: 'id-no-longer-in-model',
      reason: 'unknown-obligation'
    })
    expect(evaluation.fulfilments['id-no-longer-in-model']).toBeUndefined()
    expect(evaluation.fulfilments[id('fullName')]).toEqual({
      value: 'Alex Driver'
    })
  })

  it('obligationStateOver re-scopes over an arbitrary candidate map', () => {
    const withReveal = obligationStateOver(byName({ voluntaryExcess: 'yes' }))
    expect(withReveal[id('excessAmount')].inScope).toBe(true)
    expect(withReveal[id('excessAmount')].status).toBe('mandatory')
    const without = obligationStateOver({})
    expect(without[id('excessAmount')].inScope).toBe(false)
  })

  it('resolves pages and their owning top-level sections by id', () => {
    expect(pageById('claims').slug).toBe('claims')
    expect(pageById('named-driver-who').slug).toBe('addons/named-driver/who')
    expect(sectionOfPage('cover-type').id).toBe('your-driving-and-cover')
    expect(() => pageById('no-such-page')).toThrow(/Unknown page/)
    expect(() => sectionOfPage('no-such-page')).toThrow(/No section/)
  })
})
