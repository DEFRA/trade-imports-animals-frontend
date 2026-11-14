import { describe, expect, it } from 'vitest'
import { cphNumberWithSlashes, splitCphNumber } from './cph-number.js'

const SLASHED = '12/345/6789'

describe('cphNumberWithSlashes', () => {
  it('Should separate the three parts of nine stored digits with slashes', () => {
    expect(cphNumberWithSlashes('123456789')).toBe(SLASHED)
  })

  it('Should read a stored number that already has slashes the same way', () => {
    expect(cphNumberWithSlashes(SLASHED)).toBe(SLASHED)
  })

  it('Should read a stored value of fewer than nine digits exactly as stored', () => {
    expect(cphNumberWithSlashes('12345')).toBe('12345')
  })

  it('Should read a stored value of more than nine digits exactly as stored', () => {
    expect(cphNumberWithSlashes('1234567890')).toBe('1234567890')
  })
})

describe('splitCphNumber', () => {
  it('Should split a slashed number into county, parish and holding', () => {
    expect(splitCphNumber(SLASHED)).toStrictEqual({
      county: '12',
      parish: '345',
      holding: '6789'
    })
  })

  it('Should split nothing into empty parts', () => {
    expect(splitCphNumber(undefined)).toStrictEqual({
      county: '',
      parish: '',
      holding: ''
    })
  })
})
