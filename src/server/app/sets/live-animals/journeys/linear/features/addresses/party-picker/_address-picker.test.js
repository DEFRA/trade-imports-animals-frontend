import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../../config/nunjucks/nunjucks.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as addressesCopy } from '../copy/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment
const pickerCopy = addressesCopy.picker

const renderResults = (rows) =>
  environment.renderString(
    `{% from "live-animals/journeys/linear/features/addresses/party-picker/_address-picker.njk" import addressPickerResults %}
     {{ addressPickerResults(picker, copy) }}`,
    {
      picker: {
        rows,
        resultsCaption: pickerCopy.resultsCaption(rows.length, rows.length)
      },
      copy: pickerCopy
    }
  )

const renderPicker = () =>
  environment.renderString(
    `{% from "live-animals/journeys/linear/features/addresses/party-picker/_address-picker.njk" import addressPicker %}
     {{ addressPicker(picker, crumb, copy, saveActionsCopy, hubHref) }}`,
    {
      picker: { page: 1, rows: [], query: '' },
      crumb: 'test-crumb',
      copy: pickerCopy,
      saveActionsCopy: sharedEn.saveActions,
      hubHref: '/notifications/journey-1/hub'
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

describe('addressPicker macro', () => {
  it('Should end with the primary alone, since a picker is reached from the consignment addresses page', () => {
    const html = renderPicker()

    // The picker's controller redirects to the addresses page and never reads
    // `exit`, so a rendered "Save and return to overview" would save and then
    // land the trader in the wrong place. The ending must stay primary-only.
    expect(html).toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).toContain('value="save"')
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).not.toContain('name="exit"')
  })
})
