import { describe, expect, it } from 'vitest'

import { speciesLabel } from './species-label.js'

describe('#speciesLabel', () => {
  it('Should label a species by its Latin name, never its common name', () => {
    expect(
      speciesLabel({
        speciesLatinName: 'Bos taurus',
        speciesCommonName: 'Cattle'
      })
    ).toBe('Bos taurus')
  })

  it('Should label a line with no Latin name as blank', () => {
    expect(speciesLabel({ speciesCommonName: 'Cattle' })).toBe('')
  })
})
