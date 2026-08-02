import { describe, expect, it } from 'vitest'

import {
  COUNTRIES,
  REGION_FILTER_CODES,
  UK_SUBDIVISION_CODES,
  countryLabel,
  countryOptions,
  ukSubdivisionOptions
} from './countries.js'

describe('plant-products country reference data', () => {
  it('contains 253 valid entries with unique codes', () => {
    expect(COUNTRIES).toHaveLength(253)
    expect(new Set(COUNTRIES.map(({ code }) => code))).toHaveProperty(
      'size',
      253
    )

    for (const { code, name } of COUNTRIES) {
      expect(code).toEqual(expect.any(String))
      expect(code.length).toBeGreaterThan(0)
      expect(name).toEqual(expect.any(String))
      expect(name.length).toBeGreaterThan(0)
    }
  })

  it('does not contain a selectable GB entry', () => {
    expect(COUNTRIES.some(({ code }) => code === 'GB')).toBe(false)
  })

  it('uses the rendered Republic of Ireland label', () => {
    expect(countryLabel('IE')).toBe('Republic of Ireland')
  })

  it.each([
    ['AX', 'Aland Islands'],
    ['AG', 'Antigua and Barbuda'],
    ['BV', 'Bouvet Island'],
    ['ES-CN', 'Canary Islands'],
    ['VA', 'Holy See'],
    ['TR', 'Turkey'],
    ['US', 'United States of America'],
    ['VN', 'Viet Nam'],
    ['VI', 'Virgin Islands of the United States'],
    ['AT', 'Austria'],
    ['BZ', 'Belize']
  ])('labels %s as %s', (code, name) => {
    expect(countryLabel(code)).toBe(name)
  })

  it('returns undefined for an unknown code', () => {
    expect(countryLabel('UNKNOWN')).toBeUndefined()
  })

  it('provides 249 flat country options in alphabetical order', () => {
    const options = countryOptions()
    const texts = options.map(({ text }) => text)

    expect(options).toHaveLength(249)
    expect(texts).toEqual(
      [...texts].sort((first, second) => first.localeCompare(second))
    )

    for (const option of options) {
      expect(option).toEqual({
        value: expect.any(String),
        text: expect.any(String)
      })
    }

    const values = options.map(({ value }) => value)
    for (const excludedCode of [
      ...UK_SUBDIVISION_CODES,
      ...REGION_FILTER_CODES
    ]) {
      expect(values).not.toContain(excludedCode)
    }
  })

  it('provides the UK subdivisions in rendered trace order', () => {
    expect(ukSubdivisionOptions()).toEqual([
      { value: 'GB-ENG', text: 'England' },
      { value: 'GB-SCT', text: 'Scotland' },
      { value: 'GB-WLS', text: 'Wales' },
      { value: 'GB-NIR', text: 'Northern Ireland' }
    ])
  })

  it('defines the dashboard region filter codes without display labels', () => {
    expect(REGION_FILTER_CODES).toEqual(['EEA', 'GB-CI', 'ROW'])
  })

  it('freezes the exported collections and option arrays', () => {
    expect(Object.isFrozen(COUNTRIES)).toBe(true)
    expect(Object.isFrozen(UK_SUBDIVISION_CODES)).toBe(true)
    expect(Object.isFrozen(REGION_FILTER_CODES)).toBe(true)
    expect(Object.isFrozen(countryOptions())).toBe(true)
    expect(Object.isFrozen(ukSubdivisionOptions())).toBe(true)
  })
})
