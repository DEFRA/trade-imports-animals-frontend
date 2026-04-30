import { describe, expect, test } from 'vitest'
import { portOfEntrySchema } from './port-of-entry-schema.js'

describe('portOfEntrySchema', () => {
  describe('valid payloads', () => {
    test('accepts a fully populated payload', () => {
      const { error } = portOfEntrySchema.validate({
        portOfEntry: 'ABERDEEN',
        'arrivalDate-day': 27,
        'arrivalDate-month': 3,
        'arrivalDate-year': 2026
      })
      expect(error).toBeUndefined()
    })

    test('accepts an empty payload', () => {
      const { error } = portOfEntrySchema.validate({})
      expect(error).toBeUndefined()
    })

    test('accepts null date fields', () => {
      const { error } = portOfEntrySchema.validate({
        portOfEntry: 'EDINBURGH',
        'arrivalDate-day': null,
        'arrivalDate-month': null,
        'arrivalDate-year': null
      })
      expect(error).toBeUndefined()
    })

    test('accepts empty string date fields (browser default for unfilled inputs)', () => {
      const { error } = portOfEntrySchema.validate({
        'arrivalDate-day': '',
        'arrivalDate-month': '',
        'arrivalDate-year': ''
      })
      expect(error).toBeUndefined()
    })

    test('accepts an optional crumb field', () => {
      const { error } = portOfEntrySchema.validate({
        portOfEntry: 'EAST MIDLANDS AIRPORT',
        crumb: 'csrf-token'
      })
      expect(error).toBeUndefined()
    })
  })

  describe('arrivalDate-day validation', () => {
    test('fails when day is 0', () => {
      const { error } = portOfEntrySchema.validate({ 'arrivalDate-day': 0 })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid day')
    })

    test('fails when day is 32', () => {
      const { error } = portOfEntrySchema.validate({ 'arrivalDate-day': 32 })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid day')
    })
  })

  describe('arrivalDate-month validation', () => {
    test('fails when month is 0', () => {
      const { error } = portOfEntrySchema.validate({ 'arrivalDate-month': 0 })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid month')
    })

    test('fails when month is 13', () => {
      const { error } = portOfEntrySchema.validate({ 'arrivalDate-month': 13 })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid month')
    })
  })

  describe('arrivalDate-year validation', () => {
    test('fails when year is 3 digits', () => {
      const { error } = portOfEntrySchema.validate({ 'arrivalDate-year': 999 })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid year')
    })
  })
})
