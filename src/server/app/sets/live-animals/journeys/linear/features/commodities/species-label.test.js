import { describe, expect, it } from 'vitest'

import { speciesLabel } from './species-label.js'

const BOS_TAURUS = 'Bos taurus'

describe('#speciesLabel', () => {
  it('Should label a species as its scientific name with its common name in brackets', () => {
    expect(
      speciesLabel({
        speciesLatinName: BOS_TAURUS,
        speciesCommonName: 'Cattle'
      })
    ).toBe(`${BOS_TAURUS} (Cattle)`)
  })

  it('Should label a species with no common name as its scientific name alone, with no brackets', () => {
    expect(speciesLabel({ speciesLatinName: BOS_TAURUS })).toBe(BOS_TAURUS)
  })

  it('Should label a line with no scientific name yet as blank', () => {
    expect(speciesLabel({ speciesCommonName: 'Cattle' })).toBe('')
  })
})
