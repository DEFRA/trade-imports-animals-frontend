import { describe, it, expect } from 'vitest'
import { cyaRows, pageViewModel, resolveReasons } from './view.js'
import { changePath, hubPath, pagePath } from '../journey/paths.js'
import { evaluate, journeyFlow, journeyModel } from './status.js'
import { createJourneyRepository } from '../store/index.js'

const { identifiers } = journeyModel()

const evaluationWith = (fulfilmentsByName = {}, { submit = false } = {}) => {
  const repository = createJourneyRepository()
  const journey = repository.create(journeyFlow().id)
  const fulfilments = Object.fromEntries(
    Object.entries(fulfilmentsByName).map(([name, value]) => {
      const record = identifiers.recordOfName(name)
      return [record.id, record.cardinality === 'indexed' ? value : { value }]
    })
  )
  repository.saveFulfilments(journey.journeyId, fulfilments)
  if (submit) {
    repository.submit(journey.journeyId)
  }
  return evaluate(repository.get(journey.journeyId))
}

/** Indexed entries are passed pre-shaped ({ fid: { value } }). */
const indexed = (entries) => entries

const FULL = {
  email: 'sam@example.com',
  fullName: 'Alex Driver',
  country: 'wales',
  dateOfBirth: { day: '27', month: '3', year: '1985' },
  registration: 'AB12CDE',
  make: 'Ford',
  model: 'Focus',
  year: '2018',
  estimatedValue: '5000',
  yearsNoClaims: '5',
  hadClaims: 'yes',
  claimType: indexed({ c1: { value: 'theft' } }),
  claimAmount: indexed({ c1: { value: '450' } }),
  coverType: 'comprehensive',
  voluntaryExcess: 'yes',
  excessAmount: '250',
  extras: ['breakdown', 'legal'],
  addons: ['protected-ncd'],
  ncdYears: indexed({ 'protected-ncd': { value: '5' } })
}

const keysOf = (rows) => rows.map((row) => row.key.text)
const rowByKey = (rows, key) => rows.find((row) => row.key.text === key)

describe('contract/view — pageViewModel', () => {
  it('projects About you into six widgets with pinned copy and no required attribute', () => {
    const view = pageViewModel('about-you', evaluationWith())
    expect(view.heading).toBe('About you')
    expect(view.buttonText).toBe('Save and continue')
    expect(view.backLink).toBe(hubPath())
    expect(view.fields).toHaveLength(6)
    expect(view.fields[0].args.id).toBe('fullName')
    expect(view.fields[0].args.label.text).toBe('Full name')
    expect(view.fields.at(-1).type).toBe('date')
    expect(JSON.stringify(view.fields)).not.toContain('"required"')
  })

  it('wires checkSave fieldErrors onto the failing widget', () => {
    const view = pageViewModel('about-you', evaluationWith(), {
      fullName: 'Full name is required'
    })
    expect(view.fields[0].args.errorMessage).toEqual({
      text: 'Full name is required'
    })
  })

  it('folds the excessAmount reveal under the voluntaryExcess Yes radio', () => {
    const view = pageViewModel('cover-type', evaluationWith())
    expect(view.fields).toHaveLength(2)
    const [yes] = view.fields[1].args.items
    expect(yes).toMatchObject({ value: 'yes', text: 'Yes' })
    expect(yes.reveal.args.id).toBe('excessAmount')
  })

  it('expands presentsForEach into per-fulfilment encoded input names', () => {
    const view = pageViewModel(
      'claims',
      evaluationWith({
        hadClaims: 'yes',
        claimType: indexed({ c1: { value: 'theft' } }),
        claimAmount: indexed({ c1: { value: '450' } })
      })
    )
    expect(view.fields).toHaveLength(2)
    expect(view.fields[0].args.name).toBe('claimType__c1')
    expect(view.fields[1].args.id).toBe('claimAmount__c1')
  })

  it('never renders the system-handled quote as an input', () => {
    const view = pageViewModel('quote-summary', evaluationWith())
    expect(view.fields).toEqual([])
  })
})

describe('contract/view — cyaRows (spike-a parity)', () => {
  it('mirrors the full journey row set in Flow order', () => {
    const { rows, prompts } = cyaRows(evaluationWith(FULL))
    expect(keysOf(rows)).toEqual([
      'Email',
      'Name',
      'Preferred name',
      'Telephone',
      'Postcode',
      'Country',
      'Date of birth',
      'Registration',
      'Vehicle',
      'Estimated value',
      'Years no claims',
      'Recent claims',
      'Penalty points',
      'Claim 1',
      'Cover',
      'Voluntary excess',
      'Optional extras',
      'Protect your no-claims discount'
    ])
    expect(rowByKey(rows, 'Vehicle').value.text).toBe('Ford Focus 2018')
    expect(rowByKey(rows, 'Country').value.text).toBe('Wales')
    expect(rowByKey(rows, 'Date of birth').value.text).toBe('27/3/1985')
    expect(rowByKey(rows, 'Estimated value').value.text).toBe('£5000')
    expect(rowByKey(rows, 'Recent claims').value.text).toBe('Yes')
    expect(rowByKey(rows, 'Penalty points').value.text).toBe('0')
    expect(rowByKey(rows, 'Claim 1').value.text).toBe('Theft — £450')
    expect(rowByKey(rows, 'Cover').value.text).toBe('Comprehensive')
    expect(rowByKey(rows, 'Voluntary excess').value.text).toBe('£250')
    expect(rowByKey(rows, 'Optional extras').value.text).toBe(
      'Breakdown cover, Motor legal protection'
    )
    expect(rowByKey(rows, 'Protect your no-claims discount').value.text).toBe(
      'Added'
    )
    expect(prompts).toEqual([])
  })

  it("pins the 'Change recent claims' accessible name and the own-flow claims href", () => {
    const { rows } = cyaRows(evaluationWith(FULL))
    expect(rowByKey(rows, 'Recent claims').actions.items[0]).toEqual({
      href: changePath('driving-history'),
      text: 'Change',
      visuallyHiddenText: 'recent claims'
    })
    expect(rowByKey(rows, 'Claim 1').actions.items[0].href).toBe(
      pagePath('claims')
    )
  })

  it('prices absence like spike-a: Not provided / None / No / 0 defaults', () => {
    const { rows } = cyaRows(evaluationWith())
    expect(rowByKey(rows, 'Email').value.text).toBe('Not provided')
    expect(rowByKey(rows, 'Vehicle').value.text).toBe('Not provided')
    expect(rowByKey(rows, 'Recent claims').value.text).toBe('No')
    expect(rowByKey(rows, 'Penalty points').value.text).toBe('0')
    expect(rowByKey(rows, 'Voluntary excess').value.text).toBe('None')
    expect(rowByKey(rows, 'Optional extras').value.text).toBe('None')
    expect(rowByKey(rows, 'Added to policy').value.text).toBe('None')
    expect(keysOf(rows)).not.toContain('Claim 1')
    expect(keysOf(rows)).not.toContain('Claims')
  })

  it('shows the pinned none-row for an in-scope empty claims collection', () => {
    const { rows } = cyaRows(evaluationWith({ hadClaims: 'yes' }))
    expect(rowByKey(rows, 'Claims').value.text).toBe('None added')
  })

  it('marks a selected add-on Incomplete until its follow-ups are fulfilled', () => {
    const { rows } = cyaRows(evaluationWith({ addons: ['named-driver'] }))
    expect(rowByKey(rows, 'Add a named driver').value.text).toBe('Incomplete')
  })

  it('drops every Change action once Submitted (the read-only CYA)', () => {
    const { rows } = cyaRows(
      evaluationWith(
        { ...FULL, hadClaims: 'no', claimType: {}, claimAmount: {} },
        { submit: true }
      )
    )
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.actions === undefined)).toBe(true)
  })

  it('renders soft prompts with provenance for a mid-journey CYA', () => {
    const { prompts } = cyaRows(evaluationWith({ hadClaims: 'yes' }))
    const claims = prompts.find((prompt) => prompt.name === 'claimType')
    expect(claims.text).toBe('Add at least one claim')
    expect(claims.because).toEqual(['You answered "yes" for Had claims'])
    expect(claims.href).toBe(pagePath('claims'))
    expect(prompts.map((prompt) => prompt.name)).toContain('email')
  })
})

describe('contract/view — resolveReasons', () => {
  it('resolves dotted reason records and throws on unknown codes', () => {
    expect(resolveReasons([{ code: 'mandate.email.missing' }])).toEqual([
      'Email is required'
    ])
    expect(() => resolveReasons([{ code: 'mandate.made.up' }])).toThrow(
      /Unknown message code/
    )
  })
})
