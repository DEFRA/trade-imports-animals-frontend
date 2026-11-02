import { describe, expect, it } from 'vitest'

import { lineTitle } from './line-title.js'

describe('#lineTitle', () => {
  it('Should title a line by its code, a dash and the Latin name of its species', () => {
    expect(
      lineTitle({
        commodityCode: ' 0102 ',
        speciesLatinName: 'Bos taurus',
        speciesCommonName: 'Cattle'
      })
    ).toBe('0102 — Bos taurus')
  })

  it('Should title a line with no species by its code alone', () => {
    expect(lineTitle({ commodityCode: '0102' })).toBe('0102')
  })
})
