import { describe, expect, it } from 'vitest'

import { speciesLabelFor } from './species-label.js'

describe('species label', () => {
  it('Should put the common name in front of the scientific name', () => {
    expect(
      speciesLabelFor('Cow', {
        value: '1148346',
        text: 'Bos taurus',
        commonName: 'Domestic cattle'
      })
    ).toBe('Domestic cattle (Bos taurus)')
  })

  it('Should fall back to the commodity name where a species has no common name', () => {
    expect(
      speciesLabelFor('Fish', { value: '901101', text: 'Cyprinidae' })
    ).toBe('Fish (Cyprinidae)')
  })
})
