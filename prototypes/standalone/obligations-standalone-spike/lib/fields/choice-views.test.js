import { describe, it, expect } from 'vitest'
import {
  radiosView,
  booleanView,
  checkboxesView,
  selectView
} from './choice-views.js'

const coverOptions = [
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    hint: 'Covers you, your car and other people'
  },
  { value: 'third-party', label: 'Third party only' }
]

describe('lib/fields/choice-views — radios, boolean, checkboxes, select', () => {
  it('builds radios with per-option hints and checked state', () => {
    const view = radiosView({
      inputName: 'coverType',
      label: 'Which cover do you want?',
      options: coverOptions,
      value: 'third-party'
    })
    expect(view.type).toBe('radios')
    expect(view.args.name).toBe('coverType')
    expect(view.args.fieldset.legend).toEqual({
      text: 'Which cover do you want?',
      classes: 'govuk-fieldset__legend--m'
    })
    expect(view.args.items).toEqual([
      {
        value: 'comprehensive',
        text: 'Comprehensive',
        hint: { text: 'Covers you, your car and other people' },
        checked: false
      },
      {
        value: 'third-party',
        text: 'Third party only',
        hint: undefined,
        checked: true
      }
    ])
  })

  it('builds one yes/no pair with a single visible Yes label', () => {
    const view = booleanView({
      inputName: 'voluntaryExcess',
      label: 'Do you want to add a voluntary excess?',
      value: 'yes'
    })
    const yesItems = view.args.items.filter((item) => item.text === 'Yes')
    expect(yesItems).toHaveLength(1)
    expect(view.args.items).toEqual([
      { value: 'yes', text: 'Yes', checked: true },
      { value: 'no', text: 'No', checked: false }
    ])
  })

  it('checks checkboxes from a stored array (or a single string)', () => {
    const options = [
      { value: 'breakdown', label: 'Breakdown cover' },
      { value: 'legal', label: 'Motor legal protection' }
    ]
    const view = checkboxesView({
      inputName: 'extras',
      label: 'Add any optional extras',
      options,
      value: ['legal']
    })
    expect(view.args.items.map((item) => item.checked)).toEqual([false, true])
    const single = checkboxesView({
      inputName: 'extras',
      label: 'Add any optional extras',
      options,
      value: 'breakdown'
    })
    expect(single.args.items.map((item) => item.checked)).toEqual([true, false])
  })

  it('builds a select with a leading placeholder option', () => {
    const view = selectView({
      inputName: 'country',
      label: 'Country of residence',
      placeholder: 'Choose…',
      options: [
        { value: 'england', label: 'England' },
        { value: 'wales', label: 'Wales' }
      ],
      value: 'wales'
    })
    expect(view.type).toBe('select')
    expect(view.args.items).toEqual([
      { value: '', text: 'Choose…' },
      { value: 'england', text: 'England', selected: false },
      { value: 'wales', text: 'Wales', selected: true }
    ])
  })

  it('never emits required from any builder', () => {
    for (const view of [
      radiosView({ inputName: 'a', label: 'A', options: coverOptions }),
      booleanView({ inputName: 'b', label: 'B' }),
      checkboxesView({ inputName: 'c', label: 'C', options: coverOptions }),
      selectView({ inputName: 'd', label: 'D', options: coverOptions })
    ]) {
      expect(JSON.stringify(view)).not.toContain('required')
    }
  })
})
