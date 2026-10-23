import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../../config/nunjucks/nunjucks.js'
import {
  documentOf,
  trimmedTextOf
} from '../../../../../../../../common/test-helpers/document-of.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy as addressesCopy } from '../copy/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment
const pickerCopy = addressesCopy.picker

const render = ({ addAddressHref } = {}) =>
  documentOf(
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
  )

const addControlsIn = (scope) =>
  [...scope.querySelectorAll('a, button')].filter(
    (element) => trimmedTextOf(element) === pickerCopy.addNewAddress
  )

const headingRowOf = (document) =>
  document.querySelector('h1').closest('.govuk-grid-row')

describe('party picker page add-address control', () => {
  it('Should hold the heading and one secondary Add a new address button in the heading row', () => {
    const headingRow = headingRowOf(render({ addAddressHref: '/add-address' }))
    const controls = addControlsIn(headingRow)

    expect(headingRow.querySelectorAll('h1')).toHaveLength(1)
    expect(controls).toHaveLength(1)
    expect(controls[0].matches('a.govuk-button.govuk-button--secondary')).toBe(
      true
    )
  })

  it('Should render no Add a new address link or button after the heading row', () => {
    const document = render({ addAddressHref: '/add-address' })
    const headingRow = headingRowOf(document)

    expect(addControlsIn(headingRow)).toHaveLength(1)
    expect(addControlsIn(document.body)).toHaveLength(1)
    expect(headingRow.nextElementSibling.matches('p.govuk-body')).toBe(true)
  })

  it('Should offer no add-address control in stub mode', () => {
    expect(addControlsIn(render().body)).toHaveLength(0)
  })
})
