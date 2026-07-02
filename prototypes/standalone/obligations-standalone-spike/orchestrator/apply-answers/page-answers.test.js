import { describe, it, expect } from 'vitest'
import { createScopeRegistry } from '../../engine/index.js'
import { applyAnswers } from './page-answers.js'
import { claimsPage, evaluate, obligations, page } from './test-fixtures.js'

describe('orchestrator/apply-answers — canonicalise-and-write', () => {
  it('writes trimmed strings, date parts, arrays and canonical currency', () => {
    const written = applyAnswers(obligations, page, evaluate(), {
      fullName: '  Alex Driver ',
      'dateOfBirth-day': ' 27',
      'dateOfBirth-month': '3',
      'dateOfBirth-year': '1985 ',
      extras: ['breakdown', 'legal'],
      estimatedValue: '£12,000',
      voluntaryExcess: 'yes',
      excessAmount: '250'
    })
    expect(written).toEqual({
      'id-full-name': { value: 'Alex Driver' },
      'id-dob': { value: { day: '27', month: '3', year: '1985' } },
      'id-extras': { value: ['breakdown', 'legal'] },
      'id-value': { value: '12000' },
      'id-excess': { value: 'yes' },
      'id-amount': { value: '250' }
    })
  })

  it('stores answered-empty for an absent multi-select and a lone scalar as a one-item array', () => {
    const seeded = evaluate({ 'id-extras': { value: ['breakdown'] } })
    expect(applyAnswers(obligations, page, seeded, {})['id-extras']).toEqual({
      value: []
    })
    expect(
      applyAnswers(obligations, page, evaluate(), { extras: 'legal' })[
        'id-extras'
      ]
    ).toEqual({ value: ['legal'] })
  })

  it('keeps unparseable currency as typed so the round trip can re-render it', () => {
    const written = applyAnswers(obligations, page, evaluate(), {
      estimatedValue: ' not a price '
    })
    expect(written['id-value']).toEqual({ value: 'not a price' })
  })

  it('never writes file slots and keeps stored values for unposted scalars', () => {
    const seeded = evaluate({ 'id-full-name': { value: 'Kept' } })
    const written = applyAnswers(obligations, page, seeded, {
      vehiclePhoto: 'ignored.png',
      estimatedValue: '900'
    })
    expect(written['id-photo']).toBeUndefined()
    expect(written['id-full-name']).toEqual({ value: 'Kept' })
  })

  it('writes a slot the pre-write evaluation had out of scope (same-POST reveal)', () => {
    const registry = createScopeRegistry()
    registry.register('excessAmount', 'voluntaryExcessIsYes', (view) =>
      view.valueOf('voluntaryExcess') === 'yes' ? { status: 'mandatory' } : null
    )
    const written = applyAnswers(
      obligations,
      page,
      evaluate({}, { scopeRegistry: registry }),
      { voluntaryExcess: 'yes', excessAmount: '300' }
    )
    expect(written['id-amount']).toEqual({ value: '300' })
  })

  it('writes indexed slots through their encoded input names', () => {
    const seeded = evaluate({
      'id-claim-type': { 'f-1': { value: 'theft' } },
      'id-claim-amount': { 'f-1': { value: '100' } }
    })
    const written = applyAnswers(obligations, claimsPage, seeded, {
      'claimType__f-1': 'accident',
      'claimAmount__f-1': '£450'
    })
    expect(written['id-claim-type']).toEqual({ 'f-1': { value: 'accident' } })
    expect(written['id-claim-amount']).toEqual({ 'f-1': { value: '450' } })
  })

  it('is pure on inputs', () => {
    const evaluation = evaluate({ 'id-full-name': { value: 'Before' } })
    applyAnswers(obligations, page, evaluation, { fullName: 'After' })
    expect(evaluation.fulfilments['id-full-name']).toEqual({ value: 'Before' })
  })
})
