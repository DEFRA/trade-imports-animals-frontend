import { vi } from 'vitest'

import { formatDate } from './format-date.js'

describe('#formatDate', () => {
  beforeAll(() => {
    vi.useFakeTimers({
      now: new Date('2023-02-01')
    })
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe('With defaults', () => {
    test('Date should be in expected format', () => {
      expect(formatDate('2023-02-01T11:40:02.242Z')).toBe(
        'Wed 1st February 2023'
      )
    })
  })

  describe('With Date object', () => {
    test('Date should be in expected format', () => {
      expect(formatDate(new Date())).toBe('Wed 1st February 2023')
    })
  })

  describe('With format attribute', () => {
    test('Date should be in provided format', () => {
      expect(
        formatDate(
          '2023-02-01T11:40:02.242Z',
          "h:mm aaa 'on' EEEE do MMMM yyyy"
        )
      ).toBe('11:40 am on Wednesday 1st February 2023')
    })
  })

  describe('With invalid input', () => {
    test('Should return empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('')
    })

    test('Should return empty string for null', () => {
      expect(formatDate(null)).toBe('')
    })

    test('Should return empty string for empty string', () => {
      expect(formatDate('')).toBe('')
    })

    test('Should return empty string for unparseable string', () => {
      expect(formatDate('not-a-date')).toBe('')
    })

    test('Should return empty string for invalid Date object', () => {
      expect(formatDate(new Date('invalid'))).toBe('')
    })
  })
})
