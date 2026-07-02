import { describe, it, expect } from 'vitest'
import { slotViews } from '../../lib/fields/index.js'
import { renderString, TEMPLATES } from '../test-helpers.js'

/** Render FieldViewItems through the real dispatch macro. */
const renderFields = (fields) =>
  renderString(
    `{% from "${TEMPLATES}/partials/fields.njk" import renderFields %}` +
      '{{ renderFields(fields) }}',
    { fields }
  )

const labelTexts = (html) =>
  [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/g)].map((match) =>
    match[1].trim()
  )

const oneOfEveryType = () =>
  slotViews([
    { inputName: 'fullName', label: 'Full name', type: 'text' },
    { inputName: 'email', label: 'Email address', type: 'email' },
    { inputName: 'estimatedValue', label: 'Estimated value', type: 'currency' },
    { inputName: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { inputName: 'hadClaims', label: 'Any claims?', type: 'boolean' },
    {
      inputName: 'coverType',
      label: 'Which cover do you want?',
      type: 'radio',
      options: [{ value: 'comprehensive', label: 'Comprehensive' }]
    },
    {
      inputName: 'extras',
      label: 'Add any optional extras',
      type: 'multi-select',
      options: [{ value: 'breakdown', label: 'Breakdown cover' }]
    },
    {
      inputName: 'country',
      label: 'Country of residence',
      type: 'select',
      options: [{ value: 'england', label: 'England' }]
    },
    { inputName: 'notes', label: 'Notes', type: 'textarea' },
    {
      inputName: 'story',
      label: 'Story',
      type: 'textarea',
      constraints: { maxLength: 100 }
    },
    { inputName: 'vehiclePhoto', label: 'Photo of your vehicle', type: 'file' }
  ])

describe('templates/partials/fields — the govuk widget dispatch macro', () => {
  it('dispatches every FieldViewItem type to its govuk widget', () => {
    const html = renderFields(oneOfEveryType())
    for (const marker of [
      'govuk-input',
      'govuk-date-input',
      'govuk-radios',
      'govuk-checkboxes',
      'govuk-select',
      'govuk-textarea',
      'govuk-character-count',
      'govuk-file-upload'
    ]) {
      expect(html).toContain(marker)
    }
  })

  it('never emits a required attribute (server-side round trips only)', () => {
    expect(renderFields(oneOfEveryType())).not.toContain('required')
  })

  it('renders boolean radios with exactly the labels Yes and No', () => {
    const html = renderFields(
      slotViews([
        { inputName: 'hadClaims', label: 'Any claims?', type: 'boolean' }
      ])
    )
    expect(labelTexts(html)).toEqual(['Yes', 'No'])
  })

  it('recursively reveals a folded slot with a single visible Yes label', () => {
    const html = renderFields(
      slotViews([
        {
          inputName: 'voluntaryExcess',
          label: 'Do you want to add a voluntary excess?',
          type: 'boolean',
          value: 'yes'
        },
        {
          inputName: 'excessAmount',
          label: 'Voluntary excess amount',
          type: 'currency',
          revealedBy: { inputName: 'voluntaryExcess', value: 'yes' }
        }
      ])
    )
    const labels = labelTexts(html)
    expect(labels.filter((text) => text === 'Yes')).toHaveLength(1)
    expect(labels).toContain('Voluntary excess amount')
    const conditional = html.indexOf('govuk-radios__conditional')
    expect(conditional).toBeGreaterThan(-1)
    expect(html.indexOf('name="excessAmount"')).toBeGreaterThan(conditional)
    expect(html).toContain('checked')
  })

  it('labels the three date parts Day, Month and Year unambiguously', () => {
    const html = renderFields(
      slotViews([
        { inputName: 'dateOfBirth', label: 'Date of birth', type: 'date' }
      ])
    )
    expect(labelTexts(html)).toEqual(['Day', 'Month', 'Year'])
    for (const part of ['day', 'month', 'year']) {
      expect(html).toContain(`name="dateOfBirth-${part}"`)
    }
  })

  it('adds a native datalist when a text slot carries suggestions', () => {
    const html = renderFields(
      slotViews([
        {
          inputName: 'make',
          label: 'Make',
          type: 'text',
          suggestions: ['Audi', 'Ford']
        }
      ])
    )
    expect(html).toContain('list="make-suggestions"')
    expect(html).toContain('<datalist id="make-suggestions">')
    expect(html).toContain('<option value="Audi">')
  })

  it('wires GDS error messages onto the failing widget', () => {
    const html = renderFields(
      slotViews([{ inputName: 'fullName', label: 'Full name', type: 'text' }], {
        fullName: 'Enter your full name'
      })
    )
    expect(html).toContain('govuk-error-message')
    expect(html).toContain('id="fullName-error"')
    expect(html).toMatch(/aria-describedby="[^"]*fullName-error/)
  })
})
