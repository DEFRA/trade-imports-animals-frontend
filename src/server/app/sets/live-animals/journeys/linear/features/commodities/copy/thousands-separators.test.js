import { describe, expect, it } from 'vitest'

import { withThousandsSeparators } from './thousands-separators.js'

describe('#withThousandsSeparators', () => {
  it('Should leave a value under a thousand with no separator', () => {
    expect(withThousandsSeparators(427)).toBe('427')
  })

  it('Should group a value of exactly a thousand with one separator', () => {
    expect(withThousandsSeparators(1000)).toBe('1,000')
  })

  it('Should group the largest number the service stores with a separator every three digits', () => {
    expect(withThousandsSeparators(2147483647)).toBe('2,147,483,647')
  })
})
