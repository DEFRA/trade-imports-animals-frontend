import { describe, it, expect } from 'vitest'
import { guardPage, isFrozen, SURFACES } from './guards.js'
import { BASE } from '../journey/config.js'
import { changePath, pagePath } from '../journey/paths.js'
import { evaluate, journeyFlow, journeyModel } from './status.js'
import { createJourneyRepository } from '../store/index.js'

const { identifiers } = journeyModel()
const id = (name) => identifiers.idOf(name)

const COMPLETE = {
  email: 'sam@example.com',
  fullName: 'Alex Driver',
  registration: 'AB12CDE',
  hadClaims: 'no',
  coverType: 'comprehensive',
  extras: [],
  addons: []
}

const setup = (values = {}) => {
  const repository = createJourneyRepository()
  const created = repository.create(journeyFlow().id)
  const fulfilments = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [id(name), { value }])
  )
  const journey = repository.saveFulfilments(created.journeyId, fulfilments)
  return { repository, journey }
}

const submittedEvaluation = () => {
  const { repository, journey } = setup(COMPLETE)
  repository.submit(journey.journeyId)
  return evaluate(repository.get(journey.journeyId))
}

const checkYourAnswers = pagePath('check-your-answers')

describe('contract/guards — pre-submit is open (Rulings item 2)', () => {
  it('allows the hub, applicable pages, direct-URL CYA and quote-summary', () => {
    const evaluation = evaluate(setup().journey)
    expect(guardPage({ surface: 'hub' }, evaluation)).toBeNull()
    expect(
      guardPage({ surface: 'page', pageId: 'about-you' }, evaluation)
    ).toBeNull()
    expect(guardPage({ surface: 'check-your-answers' }, evaluation)).toBeNull()
    expect(
      guardPage({ method: 'post', surface: 'check-your-answers' }, evaluation)
    ).toBeNull()
    expect(guardPage({ surface: 'quote-summary' }, evaluation)).toBeNull()
  })

  it('gates confirmation to the start page until submitted (spike-a parity)', () => {
    const evaluation = evaluate(setup(COMPLETE).journey)
    expect(guardPage({ surface: 'confirmation' }, evaluation)).toBe(BASE)
  })

  it('redirects a deep link to a Not Applicable page via firstApplicablePage', () => {
    const evaluation = evaluate(setup().journey)
    expect(guardPage({ surface: 'page', pageId: 'claims' }, evaluation)).toBe(
      pagePath('driving-history')
    )
    expect(
      guardPage({ surface: 'page', pageId: 'named-driver-who' }, evaluation)
    ).toBe(pagePath('addons'))
  })

  it('lets the same pages through once their gates open', () => {
    const evaluation = evaluate(
      setup({ hadClaims: 'yes', addons: ['named-driver'] }).journey
    )
    expect(
      guardPage({ surface: 'page', pageId: 'claims' }, evaluation)
    ).toBeNull()
    expect(
      guardPage({ surface: 'page', pageId: 'named-driver-who' }, evaluation)
    ).toBeNull()
  })
})

describe('contract/guards — the post-submit freeze (Rulings item 1)', () => {
  it('resolves every journey route to read-only CYA once submitted', () => {
    const evaluation = submittedEvaluation()
    expect(guardPage({ surface: 'hub' }, evaluation)).toBe(checkYourAnswers)
    expect(
      guardPage({ surface: 'page', pageId: 'about-you' }, evaluation)
    ).toBe(checkYourAnswers)
    expect(guardPage({ surface: 'quote-summary' }, evaluation)).toBe(
      checkYourAnswers
    )
    expect(
      guardPage(
        { method: 'post', surface: 'page', pageId: 'about-you' },
        evaluation
      )
    ).toBe(checkYourAnswers)
    expect(
      guardPage({ method: 'post', surface: 'check-your-answers' }, evaluation)
    ).toBe(checkYourAnswers)
  })

  it('only the CYA and confirmation GETs survive; start stays open', () => {
    const evaluation = submittedEvaluation()
    expect(guardPage({ surface: 'check-your-answers' }, evaluation)).toBeNull()
    expect(guardPage({ surface: 'confirmation' }, evaluation)).toBeNull()
    expect(guardPage({ surface: 'start' }, evaluation)).toBeNull()
    expect(
      guardPage({ method: 'post', surface: 'start' }, evaluation)
    ).toBeNull()
  })

  it('isFrozen flips with the journey state, one way', () => {
    expect(isFrozen(evaluate(setup(COMPLETE).journey))).toBe(false)
    expect(isFrozen(submittedEvaluation())).toBe(true)
  })
})

describe('contract/guards — inputs', () => {
  it('rejects unknown surfaces loudly', () => {
    const evaluation = evaluate(setup().journey)
    expect(() => guardPage({ surface: 'admin' }, evaluation)).toThrow(
      /Unknown guard surface/
    )
    expect(SURFACES).toContain('page')
  })

  it('never guards a Change link before submit (?change=1 is plain page access)', () => {
    const evaluation = evaluate(setup(COMPLETE).journey)
    expect(changePath('about-you')).toContain('?change=1')
    expect(
      guardPage({ surface: 'page', pageId: 'about-you' }, evaluation)
    ).toBeNull()
  })
})
