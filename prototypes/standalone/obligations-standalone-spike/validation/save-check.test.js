import { describe, it, expect } from 'vitest'
import { saveCheck, candidateValue, mandateMissingCode } from './save-check.js'
import { loadJourneyModel } from '../engine/index.js'

// Resolve committed catalogue ids by obligation name — the tests never
// hardcode UUIDs, so a reminted id cannot silently strand a fixture.
const { identifiers } = loadJourneyModel()
const FULL_NAME_ID = identifiers.idOf('fullName')
const EMAIL_ID = identifiers.idOf('email')
const EXCESS_ID = identifiers.idOf('excessAmount')

const fullNameSlot = {
  obligationId: FULL_NAME_ID,
  name: 'fullName',
  type: 'text',
  inputName: 'fullName',
  mandate: 'hard'
}

const emailSlot = {
  obligationId: EMAIL_ID,
  name: 'email',
  type: 'email',
  inputName: 'email'
}

const excessSlot = {
  obligationId: EXCESS_ID,
  name: 'excessAmount',
  type: 'currency',
  inputName: 'excessAmount'
}

const inScope = (ids) =>
  Object.fromEntries(ids.map((id) => [id, { inScope: true }]))

describe('validation/save-check — the hard page-mandate gate', () => {
  it('blocks a blank hard mandate (fullName, the only one — Rulings 3)', () => {
    const findings = saveCheck(
      [fullNameSlot],
      { fullName: '  ' },
      inScope([FULL_NAME_ID])
    )
    expect(findings).toEqual([
      { inputName: 'fullName', code: 'mandate.fullName.missing' }
    ])
  })

  it('lets every page-soft blank save freely (email gate included)', () => {
    const findings = saveCheck(
      [emailSlot, excessSlot],
      { email: '', excessAmount: '' },
      inScope([EMAIL_ID, EXCESS_ID])
    )
    expect(findings).toEqual([])
  })

  it('format-checks any filled value, hard or soft', () => {
    const findings = saveCheck(
      [emailSlot],
      { email: 'not-an-email' },
      inScope([EMAIL_ID])
    )
    expect(findings).toEqual([
      { inputName: 'email', code: 'format.email.invalid' }
    ])
  })

  it('evaluates the payload-merged candidate, not the stored value', () => {
    const stored = { ...emailSlot, value: 'good@example.com' }
    expect(
      saveCheck([stored], { email: 'broken' }, inScope([EMAIL_ID]))
    ).toEqual([{ inputName: 'email', code: 'format.email.invalid' }])
    expect(saveCheck([stored], {}, inScope([EMAIL_ID]))).toEqual([])
  })

  it('catches a bad excessAmount typed in the same POST (same-POST block)', () => {
    const findings = saveCheck(
      [excessSlot],
      { excessAmount: 'lots' },
      inScope([EXCESS_ID])
    )
    expect(findings).toEqual([
      { inputName: 'excessAmount', code: 'format.excessAmount.notAmount' }
    ])
  })

  it('skips out-of-scope slots entirely', () => {
    const findings = saveCheck(
      [{ ...fullNameSlot }],
      {},
      {
        [FULL_NAME_ID]: { inScope: false }
      }
    )
    expect(findings).toEqual([])
  })

  it('treats a slot with no evaluation entry as in scope (fixtures)', () => {
    expect(saveCheck([fullNameSlot], {}, {})).toEqual([
      { inputName: 'fullName', code: 'mandate.fullName.missing' }
    ])
  })

  it('targets the day part when a date mandate is blank', () => {
    const dateSlot = {
      obligationId: 'x',
      name: 'dateOfBirth',
      type: 'date',
      inputName: 'dateOfBirth',
      mandate: 'hard'
    }
    expect(saveCheck([dateSlot], {}, {})).toEqual([
      {
        inputName: 'dateOfBirth',
        code: 'mandate.dateOfBirth.missing',
        focusSuffix: '-day'
      }
    ])
  })

  it('authors the mandate code from the obligation name', () => {
    expect(mandateMissingCode('fullName')).toBe('mandate.fullName.missing')
  })
})

describe('candidateValue — payload decode per slot type', () => {
  it('decodes date parts through the one decode seam', () => {
    const slot = { name: 'dateOfBirth', type: 'date', inputName: 'dateOfBirth' }
    expect(
      candidateValue(slot, {
        'dateOfBirth-day': '27',
        'dateOfBirth-month': '3',
        'dateOfBirth-year': '1985'
      })
    ).toEqual({ day: '27', month: '3', year: '1985' })
  })

  it('normalises a single posted checkbox to an array', () => {
    const slot = { name: 'extras', type: 'multi-select', inputName: 'extras' }
    expect(candidateValue(slot, { extras: 'breakdown' })).toEqual(['breakdown'])
    expect(candidateValue(slot, { extras: ['breakdown', 'legal'] })).toEqual([
      'breakdown',
      'legal'
    ])
  })

  it('falls back to the stored value when the payload lacks the input', () => {
    const slot = {
      name: 'email',
      type: 'email',
      inputName: 'email',
      value: 'a@b.co'
    }
    expect(candidateValue(slot, {})).toBe('a@b.co')
    expect(candidateValue(slot, { email: 'typed' })).toBe('typed')
  })
})
