import { describe, expect, it } from 'vitest'

import { measurementInput, measurementText } from './measurement-format.js'

describe('plant-products measurement formatting', () => {
  it('leaves non-canonical stored strings untouched instead of reinterpreting them', () => {
    const values = [
      ' ',
      '1e3',
      '0x10',
      'Infinity',
      'NaN',
      '0.1234567890123456789'
    ]

    for (const value of values) {
      expect(measurementText(value)).toBe(value)
      expect(measurementInput(value)).toBe(value)
    }
  })
})
