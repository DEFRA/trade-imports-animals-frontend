import { describe, it, expect } from 'vitest'
import { pickWidget, RADIO_MAX } from './field-widgets.js'

const enumEntry = { type: 'enum' }
const integerEntry = { type: 'integer' }
const dateEntry = { type: 'date' }

describe('pickWidget', () => {
  it('picks radios for a small single-select enum', () => {
    const chosen = pickWidget({
      obligation: { name: 'reasonForImport' },
      entry: enumEntry,
      options: ['a', 'b', 'c'],
      id: 'reasonForImport',
      value: undefined,
      legend: 'Reason',
      hint: null,
      labels: { a: 'Alpha', b: 'Beta', c: 'Gamma' }
    })
    expect(chosen.rule).toBe('radios')
    expect(chosen.view.type).toBe('radios')
    expect(chosen.view.args.items.map((i) => i.text)).toEqual([
      'Alpha',
      'Beta',
      'Gamma'
    ])
  })

  it('picks select for enum with more than RADIO_MAX options', () => {
    const options = Array.from({ length: RADIO_MAX + 5 }, (_, i) => `opt${i}`)
    const chosen = pickWidget({
      obligation: { name: 'countryOfOrigin' },
      entry: enumEntry,
      options,
      id: 'countryOfOrigin',
      value: undefined,
      legend: 'Country',
      hint: null,
      labels: {}
    })
    expect(chosen.rule).toBe('select')
    expect(chosen.view.type).toBe('select')
    // First item is a placeholder blank.
    expect(chosen.view.args.items[0].value).toBe('')
  })

  it('picks checkboxes for array-valued enum obligations', () => {
    const chosen = pickWidget({
      obligation: { name: 'transitedCountries' },
      entry: enumEntry,
      options: ['FR', 'DE', 'IT'],
      id: 'transitedCountries',
      value: ['FR'],
      legend: 'Transited',
      hint: null,
      labels: { FR: 'France', DE: 'Germany', IT: 'Italy' }
    })
    expect(chosen.rule).toBe('checkboxes')
    expect(chosen.view.args.items[0].checked).toBe(true)
    expect(chosen.view.args.items[1].checked).toBe(false)
  })

  it('picks a number input for integer entries', () => {
    const chosen = pickWidget({
      obligation: { name: 'numberOfAnimals' },
      entry: integerEntry,
      options: [],
      id: 'numberOfAnimals-line1',
      value: 5,
      legend: 'How many animals?'
    })
    expect(chosen.rule).toBe('number')
    expect(chosen.view.type).toBe('input')
    expect(chosen.view.args.value).toBe('5')
    expect(chosen.view.args.inputmode).toBe('numeric')
  })

  it('picks a date-style text input for date entries', () => {
    const chosen = pickWidget({
      obligation: { name: 'arrivalDateAtPort' },
      entry: dateEntry,
      options: [],
      id: 'arrivalDateAtPort',
      value: '12/12/2026',
      legend: 'Arrival date'
    })
    expect(chosen.rule).toBe('date')
    expect(chosen.view.type).toBe('input')
    expect(chosen.view.args.value).toBe('12/12/2026')
    expect(chosen.view.args.hint.text).toContain('DD/MM/YYYY')
  })

  it('falls back to a text input when no domain entry exists', () => {
    const chosen = pickWidget({
      obligation: { name: 'internalReferenceNumber' },
      entry: undefined,
      options: [],
      id: 'internalReferenceNumber',
      value: '',
      legend: 'Reference'
    })
    expect(chosen.rule).toBe('text')
    expect(chosen.view.type).toBe('input')
  })

  it('injects errorMessage when error present', () => {
    const chosen = pickWidget({
      obligation: { name: 'internalReferenceNumber' },
      entry: undefined,
      options: [],
      id: 'internalReferenceNumber',
      value: 'x'.repeat(60),
      legend: 'Reference',
      error: 'Enter no more than 58 characters'
    })
    expect(chosen.view.args.errorMessage.text).toContain('58')
  })
})
