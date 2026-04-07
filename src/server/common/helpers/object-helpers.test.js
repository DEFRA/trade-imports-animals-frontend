import { getTotal, toObject } from './object-helpers.js'

describe('#object-helpers', () => {
  describe('#toObject', () => {
    test('Wraps unknown object values using provided key', () => {
      expect(toObject('abc', 'value')).toEqual({ value: 'abc' })
      expect(toObject(42, 'n')).toEqual({ n: 42 })
      expect(toObject(null, 'x')).toEqual({ x: null })
      expect(toObject(undefined, 'x')).toEqual({ x: undefined })
    })

    test('Returns objects and arrays as-is', () => {
      const obj = { a: 1 }
      const arr = [1, 2, 3]

      expect(toObject(obj, 'ignored')).toBe(obj)
      expect(toObject(arr, 'ignored')).toBe(arr)
    })
  })

  describe('#getTotal', () => {
    test('Sum of array with numbers and numeric strings', () => {
      expect(getTotal([1, '2', 3])).toBe(6)
    })

    test('Return sum as 0 for array with non-numeric values', () => {
      expect(getTotal(['', 'abc', null, undefined])).toBe(0)
    })

    test('Parses integers with base 10', () => {
      expect(getTotal(['08', '09'])).toBe(17)
    })
  })
})
