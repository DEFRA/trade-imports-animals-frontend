import { describe, it, expect } from 'vitest'
import { textareaView, dateView, fileView } from './block-views.js'

describe('lib/fields/block-views — textarea, date and file builders', () => {
  it('builds a character count when the catalogue caps length', () => {
    const view = textareaView({
      inputName: 'modDescription',
      label: 'Describe the modifications',
      constraints: { maxLength: 200 },
      value: 'alloys'
    })
    expect(view.type).toBe('charactercount')
    expect(view.args).toMatchObject({
      id: 'modDescription',
      name: 'modDescription',
      maxlength: 200,
      value: 'alloys'
    })
  })

  it('builds a plain textarea when unconstrained', () => {
    const view = textareaView({ inputName: 'notes', label: 'Notes' })
    expect(view.type).toBe('textarea')
    expect(view.args.maxlength).toBeUndefined()
  })

  it('builds the three-part date with unambiguous Day/Month/Year labels', () => {
    const view = dateView({
      inputName: 'dateOfBirth',
      label: 'Date of birth',
      hint: 'For example, 27 3 1985',
      value: { day: '27', month: '3', year: '1985' }
    })
    expect(view.type).toBe('date')
    expect(view.args.id).toBe('dateOfBirth')
    expect(view.args.namePrefix).toBe('dateOfBirth')
    expect(view.args.fieldset).toEqual({
      legend: { text: 'Date of birth' }
    })
    expect(view.args.items).toEqual([
      {
        name: 'day',
        label: 'Day',
        classes: 'govuk-input--width-2',
        value: '27'
      },
      {
        name: 'month',
        label: 'Month',
        classes: 'govuk-input--width-2',
        value: '3'
      },
      {
        name: 'year',
        label: 'Year',
        classes: 'govuk-input--width-4',
        value: '1985'
      }
    ])
  })

  it('renders empty date parts for an unanswered date', () => {
    const view = dateView({ inputName: 'driverDob', label: 'Date of birth' })
    expect(view.args.items.map((item) => item.value)).toEqual([
      undefined,
      undefined,
      undefined
    ])
  })

  it('builds the render-only file upload without a value', () => {
    const view = fileView({
      inputName: 'vehiclePhoto',
      label: 'Upload a photo of your vehicle (optional)',
      hint: 'This is a prototype, so the file is not saved'
    })
    expect(view.type).toBe('file')
    expect(view.args).toEqual({
      id: 'vehiclePhoto',
      name: 'vehiclePhoto',
      label: { text: 'Upload a photo of your vehicle (optional)' },
      hint: { text: 'This is a prototype, so the file is not saved' }
    })
  })

  it('never emits required from any builder', () => {
    for (const view of [
      textareaView({ inputName: 'a', label: 'A' }),
      dateView({ inputName: 'b', label: 'B' }),
      fileView({ inputName: 'c', label: 'C' })
    ]) {
      expect(JSON.stringify(view)).not.toContain('required')
    }
  })
})
