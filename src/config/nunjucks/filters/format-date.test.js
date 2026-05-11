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

  describe('With null value', () => {
    test('Should return empty string', () => {
      expect(formatDate(null)).toBe('')
    })
  })

  describe('With undefined value', () => {
    test('Should return empty string', () => {
      expect(formatDate(undefined)).toBe('')
    })
  })

  describe('With empty string value', () => {
    test('Should return empty string', () => {
      expect(formatDate('')).toBe('')
    })
  })

  describe('With unparseable string value', () => {
    test('Should return empty string', () => {
      expect(formatDate('not-a-date')).toBe('')
    })
  })
})
