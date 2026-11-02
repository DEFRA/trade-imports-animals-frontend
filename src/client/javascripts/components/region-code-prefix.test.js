// @vitest-environment jsdom

import { createAll } from 'govuk-frontend'
import RegionCodePrefix from './region-code-prefix.js'

const PREFIXES_BY_COUNTRY = { FR: 'FR', NL: 'NL', 'ES-CN': 'ES' }

const FORM_WITH_PREFIX = `
  <form>
    <select name="countryOfOrigin">
      <option value="">Select a country</option>
      <option value="FR">France</option>
      <option value="NL">Netherlands</option>
      <option value="ES-CN">Canary Islands (Spain)</option>
      <option value="XX">Not in the map</option>
    </select>
    <div
      data-module="app-region-code-prefix"
      data-country-field-name="countryOfOrigin"
      data-prefixes-by-country='${JSON.stringify(PREFIXES_BY_COUNTRY)}'
    ><span data-region-code-prefix-text></span></div>
  </form>
`

const bindPrefix = () => {
  document.body.innerHTML = FORM_WITH_PREFIX
  const select = document.querySelector('select')
  const prefixText = document.querySelector('[data-region-code-prefix-text]')
  document.body.classList.add('govuk-frontend-supported')
  createAll(RegionCodePrefix, undefined, { scope: document.body })
  return { select, prefixText }
}

const chooseCountry = (select, value) => {
  select.value = value
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('RegionCodePrefix', () => {
  it('Should show the code of each country chosen in turn', () => {
    const { select, prefixText } = bindPrefix()

    chooseCountry(select, 'FR')
    expect(prefixText.textContent).toBe('FR')

    chooseCountry(select, 'NL')
    expect(prefixText.textContent).toBe('NL')
  })

  it("Should show a subdivision's parent country code", () => {
    const { select, prefixText } = bindPrefix()

    chooseCountry(select, 'ES-CN')

    expect(prefixText.textContent).toBe('ES')
  })

  it('Should empty the prefix when the country is cleared', () => {
    const { select, prefixText } = bindPrefix()
    chooseCountry(select, 'FR')
    expect(prefixText.textContent).toBe('FR')

    chooseCountry(select, '')

    expect(prefixText.textContent).toBe('')
  })

  it('Should empty the prefix when the chosen country has no code in the map', () => {
    const { select, prefixText } = bindPrefix()
    chooseCountry(select, 'FR')
    expect(prefixText.textContent).toBe('FR')

    chooseCountry(select, 'XX')

    expect(prefixText.textContent).toBe('')
  })
})
