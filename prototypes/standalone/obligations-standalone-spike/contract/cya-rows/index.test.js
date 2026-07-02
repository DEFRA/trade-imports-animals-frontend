import { describe, it, expect } from 'vitest'
import { changePath, pagePath } from '../../journey/paths.js'
import { evaluate, journeyFlow, journeyModel } from '../status.js'
import { createJourneyRepository } from '../../store/index.js'
import { cyaRows } from './index.js'

/** Colocated coverage for the CYA composition folder-module: the parity
 * row set in Flow order, the two change-link families (?change=1 for
 * plain question rows, own-flow links for claims and add-ons) and the
 * soft "you still need to..." prompts a mid-journey CYA renders. */

const { identifiers } = journeyModel()

const evaluationWith = (fulfilmentsByName = {}) => {
  const repository = createJourneyRepository()
  const journey = repository.create(journeyFlow().id)
  const fulfilments = Object.fromEntries(
    Object.entries(fulfilmentsByName).map(([name, value]) => {
      const record = identifiers.recordOfName(name)
      return [record.id, record.cardinality === 'indexed' ? value : { value }]
    })
  )
  repository.saveFulfilments(journey.journeyId, fulfilments)
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
const hrefOf = (row) => row.actions.items[0].href

describe('contract/cya-rows — row set, order and keys (spike-a parity)', () => {
  it('renders the full-journey parity keys in Flow order', () => {
    const { rows } = cyaRows(evaluationWith(FULL))
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
  })

  it('drops the claims loop rows entirely when the loop is out of scope', () => {
    const { rows } = cyaRows(evaluationWith({ hadClaims: 'no' }))
    expect(keysOf(rows)).not.toContain('Claim 1')
    expect(keysOf(rows)).not.toContain('Claims')
    expect(keysOf(rows)).toContain('Name')
    expect(keysOf(rows)).toContain('Recent claims')
  })
})

describe('contract/cya-rows — change links', () => {
  it("gives every plain question row a '?change=1' Change link to its page", () => {
    const { rows } = cyaRows(evaluationWith(FULL))
    expect(hrefOf(rowByKey(rows, 'Name'))).toBe(changePath('about-you'))
    expect(hrefOf(rowByKey(rows, 'Recent claims'))).toBe(
      changePath('driving-history')
    )
    expect(hrefOf(rowByKey(rows, 'Name'))).toContain('?change=1')
    expect(rowByKey(rows, 'Name').actions.items[0]).toMatchObject({
      text: 'Change',
      visuallyHiddenText: 'name'
    })
  })

  it('links claims and add-on rows to their own flow WITHOUT ?change=1', () => {
    const { rows } = cyaRows(evaluationWith(FULL))
    expect(hrefOf(rowByKey(rows, 'Claim 1'))).toBe(pagePath('claims'))
    expect(hrefOf(rowByKey(rows, 'Protect your no-claims discount'))).toBe(
      pagePath('addons')
    )
  })
})

describe("contract/cya-rows — the soft 'you still need to' prompts", () => {
  it('renders prompts with copy, provenance and change hrefs mid-journey', () => {
    const { prompts } = cyaRows(evaluationWith({ hadClaims: 'yes' }))
    expect(prompts.length).toBeGreaterThan(0)
    const claims = prompts.find((prompt) => prompt.name === 'claimType')
    expect(claims.text).toBe('Add at least one claim')
    expect(claims.because).toEqual(['You answered "yes" for Had claims'])
    expect(claims.href).toBe(pagePath('claims'))
    expect(prompts.map((prompt) => prompt.name)).toContain('email')
  })

  it('renders no prompts once every engine-mandatory obligation is met', () => {
    const { prompts } = cyaRows(evaluationWith(FULL))
    expect(prompts).toEqual([])
  })
})
