import { describe, expect, it } from 'vitest'

import { speciesCommonName, speciesListedIndividually } from './index.js'

const NOT_A_COMMODITY = 'not-a-commodity'

describe('#speciesCommonName', () => {
  it("Should give the species' own common name", () => {
    expect(speciesCommonName('Cow', '1148346')).toBe('Domestic cattle')
    expect(speciesCommonName('Cow', '716661')).toBe('American bison')
  })

  it('Should fall back to the commodity name where the catalogue holds no common name for the species', () => {
    expect(speciesCommonName('Cow', 'not-in-the-catalogue')).toBe('Cow')
    expect(speciesCommonName(NOT_A_COMMODITY, '1148346')).toBe(NOT_A_COMMODITY)
  })
})

describe('#speciesListedIndividually', () => {
  it('Should hold for the commodities on code 01061900 and for no others', () => {
    expect(speciesListedIndividually('Cat')).toBe(true)
    expect(speciesListedIndividually('Dog')).toBe(true)
    expect(speciesListedIndividually('Cow')).toBe(false)
    expect(speciesListedIndividually('Horse')).toBe(false)
    expect(speciesListedIndividually('Fish')).toBe(false)
    expect(speciesListedIndividually(NOT_A_COMMODITY)).toBe(false)
  })
})
