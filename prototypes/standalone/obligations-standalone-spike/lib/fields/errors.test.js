import { describe, it, expect } from 'vitest'
import { slotToView } from './registry.js'
import { attachError } from './errors.js'

describe('lib/fields/errors — attaching errors onto built views', () => {
  it('sets errorMessage on a plain input from its inputName key', () => {
    const slot = { inputName: 'email', label: 'Email address', type: 'email' }
    const view = slotToView(slot)
    attachError(view, slot, { email: 'Enter a valid Email' })
    expect(view.args.errorMessage).toEqual({ text: 'Enter a valid Email' })
  })

  it('leaves a view untouched when no error targets it', () => {
    const slot = { inputName: 'phone', label: 'Telephone', type: 'tel' }
    const view = slotToView(slot)
    attachError(view, slot, { email: 'Enter a valid Email' })
    expect(view.args.errorMessage).toBeUndefined()
  })

  it('targets erroring date parts with the govuk error class', () => {
    const slot = {
      inputName: 'dateOfBirth',
      label: 'Date of birth',
      type: 'date'
    }
    const view = slotToView(slot)
    attachError(view, slot, {
      'dateOfBirth-day': 'Date of birth must be a real date'
    })
    expect(view.args.errorMessage).toEqual({
      text: 'Date of birth must be a real date'
    })
    const [day, month, year] = view.args.items
    expect(day.classes).toBe('govuk-input--width-2 govuk-input--error')
    expect(month.classes).toBe('govuk-input--width-2')
    expect(year.classes).toBe('govuk-input--width-4')
  })

  it('shows the first date-part message as the combined errorMessage', () => {
    const slot = {
      inputName: 'driverDob',
      label: 'Date of birth',
      type: 'date'
    }
    const view = slotToView(slot)
    attachError(view, slot, {
      'driverDob-month': 'Month message',
      'driverDob-year': 'Year message'
    })
    expect(view.args.errorMessage).toEqual({ text: 'Month message' })
  })
})
