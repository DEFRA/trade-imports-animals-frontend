import { describe, it, expect } from 'vitest'
import {
  addFulfilment,
  applyAnswers,
  checkSave,
  removeFulfilment
} from './mutation.js'
import { evaluate, journeyFlow, journeyModel } from './status.js'
import { createJourneyRepository } from '../store/index.js'

const { identifiers } = journeyModel()
const id = (name) => identifiers.idOf(name)

const setup = () => {
  const repository = createJourneyRepository()
  const journey = repository.create(journeyFlow().id)
  return { repository, journey, options: { repository } }
}

describe('contract/mutation — checkSave (the pure save gate)', () => {
  it('blocks a blank fullName with the GDS error structures (the one page-hard field)', () => {
    const { journey } = setup()
    const result = checkSave('about-you', { fullName: '  ' }, evaluate(journey))
    expect(result.ok).toBe(false)
    expect(result.errorSummary).toEqual([
      { text: 'Full name is required', href: '#fullName' }
    ])
    expect(result.fieldErrors.fullName).toBe('Full name is required')
  })

  it('lets every page-soft field save blank (the email gate saves freely)', () => {
    const { journey } = setup()
    const evaluation = evaluate(journey)
    expect(checkSave('email', { email: '' }, evaluation).ok).toBe(true)
    expect(checkSave('your-vehicle', {}, evaluation).ok).toBe(true)
  })

  it('format-checks a reveal flipped into scope by the SAME post', () => {
    const { journey } = setup()
    const result = checkSave(
      'cover-type',
      {
        coverType: 'comprehensive',
        voluntaryExcess: 'yes',
        excessAmount: 'abc'
      },
      evaluate(journey)
    )
    expect(result.ok).toBe(false)
    expect(result.errorSummary).toEqual([
      { text: 'Excess amount must be an amount', href: '#excessAmount' }
    ])
  })

  it('ignores junk posted to a still-hidden reveal (out of candidate scope)', () => {
    const { journey } = setup()
    const result = checkSave(
      'cover-type',
      {
        coverType: 'comprehensive',
        voluntaryExcess: 'no',
        excessAmount: 'abc'
      },
      evaluate(journey)
    )
    expect(result.ok).toBe(true)
  })

  it('format-checks a filled optional date and focuses its day part', () => {
    const { journey } = setup()
    const result = checkSave(
      'about-you',
      {
        fullName: 'Alex Driver',
        'dateOfBirth-day': '31',
        'dateOfBirth-month': '2',
        'dateOfBirth-year': '2001'
      },
      evaluate(journey)
    )
    expect(result.ok).toBe(false)
    expect(result.errorSummary).toEqual([
      { text: 'Date of birth must be a real date', href: '#dateOfBirth-day' }
    ])
  })
})

describe('contract/mutation — the write entry points', () => {
  it('applyAnswers persists through the orchestrator and returns a fresh evaluation', () => {
    const { repository, journey, options } = setup()
    const result = applyAnswers(
      journey,
      'driving-history',
      { hadClaims: 'yes' },
      options
    )
    expect(
      repository.get(journey.journeyId).fulfilments[id('hadClaims')]
    ).toEqual({ value: 'yes' })
    expect(result.evaluation.containerStatuses.pages.claims).toBe('notStarted')
    expect(result.evaluation.journeyState).toBe('inProgress')
    expect(Object.isFrozen(result.evaluation)).toBe(true)
  })

  it('the ?change=1 path shares applyAnswers, so scope exit still wipes', () => {
    const { journey, options } = setup()
    const yes = applyAnswers(
      journey,
      'driving-history',
      { hadClaims: 'yes' },
      options
    )
    const added = addFulfilment(
      yes.journey,
      ['claimType', 'claimAmount'],
      { claimType: 'theft', claimAmount: '450' },
      options
    )
    const no = applyAnswers(
      added.journey,
      'driving-history',
      { hadClaims: 'no' },
      options
    )
    expect(no.wiped.map((wipe) => wipe.name)).toContain('claimType')
    expect(no.journey.fulfilments[id('claimType')]).toBeUndefined()
  })

  it('addFulfilment and removeFulfilment round-trip one shared claim row', () => {
    const { journey, options } = setup()
    const yes = applyAnswers(
      journey,
      'driving-history',
      { hadClaims: 'yes' },
      options
    )
    const added = addFulfilment(
      yes.journey,
      ['claimType', 'claimAmount'],
      { claimType: 'theft', claimAmount: '450' },
      options
    )
    const claimState = added.evaluation.obligations[id('claimType')]
    expect(claimState.fulfilments).toEqual([
      { fulfilmentId: added.fulfilmentId, fulfilled: true }
    ])
    expect(claimState.fulfilled).toBe(true)

    const removed = removeFulfilment(
      added.journey,
      ['claimType', 'claimAmount'],
      added.fulfilmentId,
      options
    )
    expect(removed.evaluation.obligations[id('claimType')].fulfilments).toEqual(
      []
    )
    expect(removed.evaluation.containerStatuses.pages.claims).toBe('notStarted')
  })
})
