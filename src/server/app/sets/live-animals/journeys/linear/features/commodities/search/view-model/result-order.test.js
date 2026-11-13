import { describe, expect, it } from 'vitest'

import { inCodeOrder, inSpeciesLabelOrder } from './result-order.js'

describe('#inCodeOrder', () => {
  it('Should return commodity codes given out of order sorted into commodity-code order', () => {
    expect(inCodeOrder(['01061900', '0101', '0102'])).toEqual([
      '0101',
      '0102',
      '01061900'
    ])
  })
})

describe('#inSpeciesLabelOrder', () => {
  it("Should return a group's rows given out of order sorted into species-label order", () => {
    const bosTaurus = { speciesLatinName: 'Bos taurus' }
    const bison = { speciesLatinName: 'Bison' }
    const bubalus = { speciesLatinName: 'Bubalus' }
    expect(inSpeciesLabelOrder([bosTaurus, bubalus, bison])).toEqual([
      bison,
      bosTaurus,
      bubalus
    ])
  })
})
