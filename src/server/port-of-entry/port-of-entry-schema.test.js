import { describe, expect, test } from 'vitest'
import { portOfEntrySchema } from './port-of-entry-schema.js'

describe('portOfEntrySchema', () => {
  describe('valid payloads', () => {
    test('accepts a fully populated payload', () => {
      const { error } = portOfEntrySchema.validate({
        portOfEntry: 'ABERDEEN',
        'arrivalDate-day': 27,
        'arrivalDate-month': 3,
        'arrivalDate-year': 2026,
        meansOfTransport: 'VESSEL',
        transportIdentification: 'Vessel Poseidon',
        transportDocumentReference: 'BILL-OF-LADING-001'
      })
      expect(error).toBeUndefined()
    })

    test('accepts a payload with only the mandatory means of transport', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'AIRPLANE'
      })
      expect(error).toBeUndefined()
    })

    test('accepts null date fields', () => {
      const { error } = portOfEntrySchema.validate({
        portOfEntry: 'EDINBURGH',
        'arrivalDate-day': null,
        'arrivalDate-month': null,
        'arrivalDate-year': null,
        meansOfTransport: 'RAILWAY'
      })
      expect(error).toBeUndefined()
    })

    test('accepts empty string date fields (browser default for unfilled inputs)', () => {
      const { error } = portOfEntrySchema.validate({
        'arrivalDate-day': '',
        'arrivalDate-month': '',
        'arrivalDate-year': '',
        meansOfTransport: 'ROAD_VEHICLE'
      })
      expect(error).toBeUndefined()
    })

    test('accepts an optional crumb field', () => {
      const { error } = portOfEntrySchema.validate({
        portOfEntry: 'EAST MIDLANDS AIRPORT',
        meansOfTransport: 'VESSEL',
        crumb: 'csrf-token'
      })
      expect(error).toBeUndefined()
    })

    test('accepts empty and null optional text fields', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        transportIdentification: '',
        transportDocumentReference: null
      })
      expect(error).toBeUndefined()
    })

    test('accepts text fields of exactly 58 characters', () => {
      const fiftyEight = 'a'.repeat(58)
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        transportIdentification: fiftyEight,
        transportDocumentReference: fiftyEight
      })
      expect(error).toBeUndefined()
    })
  })

  describe('meansOfTransport validation', () => {
    test('fails when means of transport is missing', () => {
      const { error } = portOfEntrySchema.validate({ portOfEntry: 'ABERDEEN' })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Select a means of transport')
    })

    test('fails when means of transport is empty', () => {
      const { error } = portOfEntrySchema.validate({ meansOfTransport: '' })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Select a means of transport')
    })

    test('fails when means of transport is not one of the allowed values', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'SUBMARINE'
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Select a means of transport')
    })
  })

  describe('transportIdentification validation', () => {
    test('fails when longer than 58 characters', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        transportIdentification: 'a'.repeat(59)
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Transport identification must be 58 characters or less'
      )
    })
  })

  describe('transportDocumentReference validation', () => {
    test('fails when longer than 58 characters', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        transportDocumentReference: 'a'.repeat(59)
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe(
        'Transport document reference must be 58 characters or less'
      )
    })
  })

  describe('arrivalDate-day validation', () => {
    test('fails when day is 0', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        'arrivalDate-day': 0
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid day')
    })

    test('fails when day is 32', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        'arrivalDate-day': 32
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid day')
    })
  })

  describe('arrivalDate-month validation', () => {
    test('fails when month is 0', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        'arrivalDate-month': 0
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid month')
    })

    test('fails when month is 13', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        'arrivalDate-month': 13
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid month')
    })
  })

  describe('arrivalDate-year validation', () => {
    test('fails when year is 3 digits', () => {
      const { error } = portOfEntrySchema.validate({
        meansOfTransport: 'VESSEL',
        'arrivalDate-year': 999
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toBe('Enter a valid year')
    })
  })
})
