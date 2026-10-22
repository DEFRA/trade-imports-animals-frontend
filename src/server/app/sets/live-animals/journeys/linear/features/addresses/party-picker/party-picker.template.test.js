import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy as addressesCopy } from '../copy/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment
const pickerCopy = addressesCopy.picker

const render = ({ addAddressHref } = {}) =>
  environment.render(
    'live-animals/journeys/linear/features/addresses/party-picker/party-picker.njk',
    {
      pageTitle: 'Consignor',
      heading: 'Consignor',
      description: 'Choose the consignor.',
      pickerCopy,
      sharedCopy,
      addAddressHref,
      picker: { page: 1, rows: [], query: '' },
      userSession: { isAuthenticated: true, displayName: 'Sam Example' },
      getAssetPath: (asset) => `/assets/${asset}`,
      hubHref: '/notifications/journey-1/addresses',
      crumb: 'test-crumb'
    }
  )

const addControlsIn = ($, scope) =>
  scope
    .find('a, button')
    .filter(
      (_, element) => $(element).text().trim() === pickerCopy.addNewAddress
    )

describe('party picker page add-address control', () => {
  it('Should hold the heading and one secondary Add a new address button in the heading row', () => {
    const $ = load(render({ addAddressHref: '/add-address' }))
    const headingRow = $('h1').closest('.govuk-grid-row')
    const controls = addControlsIn($, headingRow)

    expect(headingRow.find('h1')).toHaveLength(1)
    expect(controls).toHaveLength(1)
    expect(controls.is('a.govuk-button.govuk-button--secondary')).toBe(true)
  })

  it('Should render no Add a new address link or button after the heading row', () => {
    const $ = load(render({ addAddressHref: '/add-address' }))
    const headingRow = $('h1').closest('.govuk-grid-row')

    expect(addControlsIn($, headingRow)).toHaveLength(1)
    expect(addControlsIn($, $('body'))).toHaveLength(1)
    expect(headingRow.next().is('p.govuk-body')).toBe(true)
  })

  it('Should offer no add-address control in stub mode', () => {
    const $ = load(render())

    expect(addControlsIn($, $('body'))).toHaveLength(0)
  })
})
