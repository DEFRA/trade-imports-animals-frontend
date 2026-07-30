import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../config/nunjucks/nunjucks.js'
import { copy as addressesCopy } from '../copy/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment
const pickerCopy = addressesCopy.picker

const renderResults = (rows) =>
  environment.renderString(
    `{% from "live-animals/features/addresses/party-picker/_address-picker.njk" import addressPickerResults %}
     {{ addressPickerResults(picker, copy) }}`,
    {
      picker: {
        rows,
        resultsCaption: pickerCopy.resultsCaption(rows.length, rows.length)
      },
      copy: pickerCopy
    }
  )

const row = {
  idPrefix: 'party-astra-rosales',
  id: 'astra-rosales',
  name: 'Astra Rosales',
  checked: false,
  addressText: 'Rua da Boavista 100, Porto, 4050-113',
  country: 'Portugal',
  detailLines: [
    'Astra Rosales',
    'Rua da Boavista 100',
    'Porto',
    '4050-113',
    'Portugal'
  ]
}

describe('addressPickerResults macro', () => {
  it('Should render the accessible name inside a visually-hidden span so the radio circle stays visible', () => {
    const html = renderResults([row])

    // Regression guard: applying govuk-visually-hidden to the label element itself takes
    // the ::before/::after pseudo-elements (the radio circle) off-screen with it, so the
    // row appears un-selectable. The accessible name must live in a hidden span inside
    // the label instead — leaving the label element visible.
    expect(html).not.toMatch(
      /class="[^"]*govuk-radios__label[^"]*govuk-visually-hidden/
    )
    expect(html).toContain(
      '<span class="govuk-visually-hidden">Select Astra Rosales</span>'
    )
  })
})
