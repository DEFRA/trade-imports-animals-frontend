import { describe, expect, test } from 'vitest'
import { buildTransitedCountriesSchema } from './transited-countries-schema.js'

const validCodes = ['FR', 'DE', 'NL']

describe('buildTransitedCountriesSchema', () => {
  const schema = buildTransitedCountriesSchema(validCodes)

  test('accepts valid country codes', () => {
    const { error } = schema.validate({
      transitedCountries: ['FR', 'DE']
    })

    expect(error).toBeUndefined()
  })

  test('rejects unknown country codes', () => {
    const { error } = schema.validate({
      transitedCountries: ['XX']
    })

    expect(error).toBeDefined()
  })

  test('rejects duplicate country codes', () => {
    const { error } = schema.validate({
      transitedCountries: ['FR', 'FR']
    })

    expect(error).toBeDefined()
  })

  test('accepts removeCountry when valid', () => {
    const { error } = schema.validate({
      removeCountry: 'FR'
    })

    expect(error).toBeUndefined()
  })

  test('accepts optional search query', () => {
    const { error, value } = schema.validate({
      action: 'add',
      q: 'fra'
    })

    expect(error).toBeUndefined()
    expect(value.q).toBe('fra')
  })

  test('rejects country codes when no valid codes are configured', () => {
    const emptySchema = buildTransitedCountriesSchema([])

    const { error } = emptySchema.validate({
      transitedCountries: ['FR'],
      action: 'add'
    })

    expect(error).toBeDefined()
  })

  test('accepts empty selection when no valid codes are configured', () => {
    const emptySchema = buildTransitedCountriesSchema([])

    const { error } = emptySchema.validate({
      action: 'continue'
    })

    expect(error).toBeUndefined()
  })
})
