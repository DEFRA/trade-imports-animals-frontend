import { describe, it, expect } from 'vitest'

import {
  reasonForImport,
  countryOfOrigin,
  purposeInInternalMarket
} from '../obligations/obligations.js'

import {
  evaluateState,
  findPage,
  findSection,
  findSubsection,
  subsectionOf,
  sectionOf,
  statusOfPage,
  statusOfContainer,
  statusOfJourney,
  startPage,
  nextAfter,
  changeLinkFor,
  fieldsForPage,
  validatePagePayload
} from './contract.js'

import { STATUSES } from '../runtime.js'

describe('structural queries', () => {
  it('findPage locates by page name', () => {
    expect(findPage('reason-for-import').page).toBe('reason-for-import')
  })

  it('findSubsection locates by subsection id', () => {
    expect(findSubsection('origin').id).toBe('origin')
  })

  it('findSection locates by section id', () => {
    expect(findSection('origin-and-reason').id).toBe('origin-and-reason')
  })

  it('subsectionOf → sectionOf recovers the parent hierarchy', () => {
    const sub = subsectionOf('reason-for-import')
    expect(sub.id).toBe('reason')
    const sec = sectionOf(sub.id)
    expect(sec.id).toBe('origin-and-reason')
  })
})

describe('status', () => {
  it('statusOfJourney is NS on an empty state', () => {
    const state = evaluateState({})
    expect(statusOfJourney(state)).toBe(STATUSES.NOT_STARTED)
  })

  it('statusOfPage is NA when nothing presented is in scope', () => {
    const state = evaluateState({
      [reasonForImport.id]: 'transit-through-eu'
    })
    expect(statusOfPage(findPage('purpose-details'), state)).toBe(
      STATUSES.NOT_APPLICABLE
    )
  })

  it('statusOfContainer rolls up correctly', () => {
    const state = evaluateState({
      [countryOfOrigin.id]: 'FR',
      [reasonForImport.id]: 'transit-through-eu'
    })
    expect(statusOfContainer(findSection('origin-and-reason'), state)).toBe(
      STATUSES.FULFILLED
    )
  })
})

describe('navigation', () => {
  it('startPage lands on the first unfulfilled page', () => {
    const state = evaluateState({})
    expect(startPage(state).page).toBe('country-of-origin')
  })

  it('nextAfter walks within the subsection first', () => {
    const state = evaluateState({
      [countryOfOrigin.id]: 'FR',
      [reasonForImport.id]: 'internal-market'
    })
    const target = nextAfter(findPage('reason-for-import'), state)
    expect(target).toEqual({ kind: 'page', page: expect.any(Object) })
    expect(target.page.page).toBe('purpose-details')
  })

  it('nextAfter falls back to task-list once section complete', () => {
    const state = evaluateState({
      [countryOfOrigin.id]: 'FR',
      [reasonForImport.id]: 'transit-through-eu'
    })
    // Reason section is F once country + reason filled (purpose NA).
    const target = nextAfter(findPage('reason-for-import'), state)
    expect(target.kind).toBe('task-list')
  })

  it('changeLinkFor resolves to the first page presenting the obligation', () => {
    expect(changeLinkFor(reasonForImport.id).page).toBe('reason-for-import')
    expect(changeLinkFor(purposeInInternalMarket.id).page).toBe(
      'purpose-details'
    )
  })
})

describe('fieldsForPage', () => {
  it('produces one FieldDescriptor per in-scope presented obligation', () => {
    const state = evaluateState({})
    const fields = fieldsForPage(findPage('reason-for-import'), state)
    expect(fields).toHaveLength(1)
    expect(fields[0].obligation.name).toBe('reasonForImport')
  })
})

describe('validatePagePayload', () => {
  it('passes a valid enum submission and returns coerced values', () => {
    const state = evaluateState({})
    const result = validatePagePayload(
      findPage('reason-for-import'),
      { reasonForImport: 'internal-market' },
      state
    )
    expect(result.ok).toBe(true)
    expect(result.errorList).toEqual([])
    expect(result.values.reasonForImport.value).toBe('internal-market')
  })

  it('rejects a value not in the enum', () => {
    const state = evaluateState({})
    const result = validatePagePayload(
      findPage('reason-for-import'),
      { reasonForImport: 'nonsense' },
      state
    )
    expect(result.ok).toBe(false)
    expect(result.errorList[0].text).toContain('Select a value from the list')
  })

  it('rejects a badly formatted date at arrival-details', () => {
    const state = evaluateState({})
    const result = validatePagePayload(
      findPage('arrival-details'),
      { arrivalDateAtPort: '2026-08-01', portOfEntry: 'DVR' },
      state
    )
    // portOfEntry has no domain entry so it passes; date fails format.
    const dateError = result.errorList.find((e) =>
      e.text.includes('DD/MM/YYYY')
    )
    expect(dateError).toBeDefined()
  })

  it('accepts a well-formatted date', () => {
    const state = evaluateState({})
    const result = validatePagePayload(
      findPage('arrival-details'),
      { arrivalDateAtPort: '01/08/2026', portOfEntry: 'DVR' },
      state
    )
    expect(result.ok).toBe(true)
  })
})
