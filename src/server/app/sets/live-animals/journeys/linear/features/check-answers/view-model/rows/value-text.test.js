import { describe, expect, it } from 'vitest'

import { copy as sharedEn } from '../../../../../../../../shared/copy.en.js'
import { dateText, toArray, valueText } from './value-text.js'

describe('#valueText', () => {
  it.each([undefined, null, '', '   '])(
    'Should read a blank value as "Not applicable": %o',
    (value) => {
      expect(valueText(value)).toBe(sharedEn.notApplicable)
    }
  )

  it('Should read an object whose every value is blank as "Not applicable"', () => {
    expect(valueText({ day: '', month: null })).toBe(sharedEn.notApplicable)
  })

  it('Should render a number as its own digits, so zero survives', () => {
    expect(valueText(0)).toBe('0')
    expect(valueText(12)).toBe('12')
  })

  it('Should pass an answered string through untouched', () => {
    expect(valueText('Aberdeen Livestock Ltd')).toBe('Aberdeen Livestock Ltd')
  })
})

describe('#dateText', () => {
  it('Should read a blank date as null rather than "Not applicable"', () => {
    expect(dateText(undefined)).toBeNull()
  })

  it('Should join a date as day/month/year', () => {
    expect(dateText({ day: '27', month: '3', year: '2026' })).toBe('27/3/2026')
  })
})

describe('#toArray', () => {
  it('Should read a blank value as an empty array', () => {
    expect(toArray(undefined)).toEqual([])
  })

  it('Should wrap a single value and flatten one that is already a list', () => {
    expect(toArray('GB')).toEqual(['GB'])
    expect(toArray(['GB', 'FR'])).toEqual(['GB', 'FR'])
  })
})
