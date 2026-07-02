import { describe, it, expect } from 'vitest'
import {
  textView,
  emailView,
  telView,
  numberView,
  currencyView,
  formattedView
} from './input-views.js'

const slot = (extra) => ({
  inputName: 'field',
  label: 'A label',
  ...extra
})

describe('lib/fields/input-views — single-line govukInput builders', () => {
  it('builds a plain text input with id/name/label/value', () => {
    expect(textView(slot({ value: 'stored' }))).toEqual({
      type: 'input',
      args: {
        id: 'field',
        name: 'field',
        label: { text: 'A label' },
        hint: undefined,
        value: 'stored'
      }
    })
  })

  it('adds a datalist when the slot carries suggestions (make parity)', () => {
    const view = textView(
      slot({ inputName: 'make', suggestions: ['Audi', 'Ford'] })
    )
    expect(view.suggestions).toEqual(['Audi', 'Ford'])
    expect(view.args.attributes).toEqual({ list: 'make-suggestions' })
  })

  it('marks email inputs type=email with spellcheck off', () => {
    const view = emailView(slot({ hint: 'A hint' }))
    expect(view.args.type).toBe('email')
    expect(view.args.spellcheck).toBe(false)
    expect(view.args.hint).toEqual({ text: 'A hint' })
  })

  it('sizes tel, number and currency like spike-a', () => {
    expect(telView(slot()).args).toMatchObject({
      type: 'tel',
      classes: 'govuk-input--width-20'
    })
    expect(numberView(slot()).args).toMatchObject({
      inputmode: 'numeric',
      classes: 'govuk-input--width-5'
    })
    expect(currencyView(slot()).args).toMatchObject({
      inputmode: 'numeric',
      prefix: { text: '£' },
      classes: 'govuk-input--width-5'
    })
  })

  it('keeps formatted patterns server-side only (no pattern attribute)', () => {
    const view = formattedView(
      slot({ constraints: { pattern: '^[A-Z]{2}\\d{2}$' } })
    )
    expect(view.args.classes).toBe('govuk-input--width-10')
    expect(JSON.stringify(view)).not.toContain('pattern')
  })

  it('never emits required from any builder', () => {
    const builders = [
      textView,
      emailView,
      telView,
      numberView,
      currencyView,
      formattedView
    ]
    for (const builder of builders) {
      expect(JSON.stringify(builder(slot()))).not.toContain('required')
    }
  })
})
