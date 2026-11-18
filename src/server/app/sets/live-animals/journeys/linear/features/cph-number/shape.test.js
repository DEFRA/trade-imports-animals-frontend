import { describe, expect, it } from 'vitest'

import { displayedCphNumber, isWholeCphNumber, partsOf } from './shape.js'

const NINE_DIGITS = '123456789'
const SLASHED_NINE_DIGITS = '12/345/6789'
const SPACED_NINE_DIGITS = '12 345 6789'

describe('#partsOf', () => {
  it('Should divide nine digits into county, parish and holding, in that order', () => {
    expect(partsOf(NINE_DIGITS)).toEqual(['12', '345', '6789'])
  })

  it('Should divide a blank or absent value into three empty parts', () => {
    expect(partsOf('')).toEqual(['', '', ''])
    expect(partsOf(undefined)).toEqual(['', '', ''])
  })
})

describe('#isWholeCphNumber', () => {
  it('Should be true only when a value holds exactly nine digits', () => {
    expect(isWholeCphNumber(NINE_DIGITS)).toBe(true)
    expect(isWholeCphNumber(SLASHED_NINE_DIGITS)).toBe(true)
    expect(isWholeCphNumber('12345')).toBe(false)
    expect(isWholeCphNumber('12ABC6789')).toBe(false)
  })
})

describe('#displayedCphNumber', () => {
  it('Should read nine stored digits with a slash after the county and after the parish', () => {
    expect(displayedCphNumber(NINE_DIGITS)).toBe(SLASHED_NINE_DIGITS)
  })

  it('Should read a stored value that already carries slashes or spaces the same way', () => {
    expect(displayedCphNumber(SLASHED_NINE_DIGITS)).toBe(SLASHED_NINE_DIGITS)
    expect(displayedCphNumber(SPACED_NINE_DIGITS)).toBe(SLASHED_NINE_DIGITS)
  })

  it('Should read a stored value whose digits do not number nine exactly as stored', () => {
    expect(displayedCphNumber('12345')).toBe('12345')
    expect(displayedCphNumber('12ABC6789')).toBe('12ABC6789')
  })

  it('Should read a blank or absent value as nothing stored', () => {
    expect(displayedCphNumber('')).toBeUndefined()
    expect(displayedCphNumber(undefined)).toBeUndefined()
  })
})
