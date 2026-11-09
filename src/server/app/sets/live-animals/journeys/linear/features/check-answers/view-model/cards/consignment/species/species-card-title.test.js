import { describe, expect, it } from 'vitest'

import { copy as sharedEn } from '../../../../../../../../../../shared/copy.en.js'
import { speciesCardTitle } from './species-card-title.js'

describe('#speciesCardTitle', () => {
  it('Should title a line by its commodity code and species', () => {
    expect(
      speciesCardTitle({
        commodityCode: '0102',
        speciesLatinName: 'Bos taurus'
      })
    ).toBe('0102 — Bos taurus')
  })

  it('Should title a line with no species by its commodity code alone', () => {
    expect(speciesCardTitle({ commodityCode: '0102' })).toBe('0102')
  })

  it.each([
    ['missing', {}],
    ['null', { commodityCode: null }],
    ['blank', { commodityCode: '' }],
    ['only spaces', { commodityCode: '   ' }]
  ])(
    'Should read a commodity code that is %s as "Not applicable"',
    (_, entry) => {
      expect(speciesCardTitle(entry)).toBe(sharedEn.notApplicable)
    }
  )

  it('Should read a commodity code as answered even with a species missing', () => {
    expect(
      speciesCardTitle({ commodityCode: ' 0102 ', speciesLatinName: '' })
    ).toBe('0102')
  })
})
