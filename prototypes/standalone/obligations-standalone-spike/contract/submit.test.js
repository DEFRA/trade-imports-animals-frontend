import { describe, it, expect } from 'vitest'
import { missingPrompts, submit } from './submit.js'
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
  return { repository, journey, options: { repository } }
}

describe('contract/submit — the CYA POST hard gate', () => {
  it('never trusts the button: an unfulfilled journey gets the stale-recheck result', () => {
    const { repository, journey, options } = setup()
    const result = submit(journey, options)
    expect(result.ok).toBe(false)
    expect(result.submitted).toBe(false)
    expect(result.missing.map((item) => item.name)).toEqual(
      expect.arrayContaining(['email', 'fullName', 'coverType'])
    )
    expect(result.errorSummary).toContainEqual({
      text: 'Email is required',
      href: changePath('email')
    })
    expect(repository.get(journey.journeyId).status).toBe('in-progress')
  })

  it('calls out the zero-claims gap by name (the stale-recheck branch)', () => {
    const { journey, options } = setup({ ...COMPLETE, hadClaims: 'yes' })
    const result = submit(journey, options)
    expect(result.ok).toBe(false)
    const claims = result.missing.find((item) => item.name === 'claimType')
    expect(claims.text).toBe('Add at least one claim')
    expect(claims.because).toEqual(['You answered "yes" for Had claims'])
    expect(claims.href).toBe(pagePath('claims'))
    expect(result.errorSummary).toContainEqual({
      text: 'Add at least one claim',
      href: pagePath('claims')
    })
  })

  it('flips a Fulfilled journey one-way to Submitted with submittedAt stamped', () => {
    const { repository, journey, options } = setup(COMPLETE)
    const result = submit(journey, options)
    expect(result.ok).toBe(true)
    expect(result.journey.status).toBe('submitted')
    expect(result.journey.submittedAt).toEqual(expect.any(String))
    expect(result.reference).toMatch(/^CI-[0-9A-F]{6}$/)
    expect(result.evaluation.journeyState).toBe('submitted')
    expect(() => repository.saveFulfilments(journey.journeyId, {})).toThrow(
      /writes are blocked/
    )
  })

  it('a re-POST after submit is distinguishable: submitted true, nothing missing', () => {
    const { options, journey } = setup(COMPLETE)
    const first = submit(journey, options)
    const again = submit(first.journey, options)
    expect(again.ok).toBe(false)
    expect(again.submitted).toBe(true)
    expect(again.missing).toEqual([])
    expect(again.errorSummary).toEqual([])
  })
})

describe('contract/submit — missingPrompts', () => {
  it('is empty for a Fulfilled journey and rich for a fresh one', () => {
    expect(missingPrompts(evaluate(setup(COMPLETE).journey))).toEqual([])
    const prompts = missingPrompts(evaluate(setup().journey))
    expect(prompts.length).toBeGreaterThanOrEqual(7)
    for (const prompt of prompts) {
      expect(prompt.text).toEqual(expect.any(String))
      expect(prompt.href).toEqual(expect.any(String))
    }
  })
})
