import { describe, expect, it } from 'vitest'
import { appliesForCommodity } from './applicability.js'

describe('appliesForCommodity', () => {
  it('Should apply an allowListed obligation for a commodity in its list', () => {
    expect(appliesForCommodity('horseName', 'Horse')).toBe(true)
    expect(appliesForCommodity('animalIdentifierPassport', 'Horse')).toBe(true)
    expect(appliesForCommodity('permanentAddress', 'Cat')).toBe(true)
  })

  it('Should not apply an allowListed obligation for a commodity outside its list', () => {
    expect(appliesForCommodity('horseName', 'Cow')).toBe(false)
    expect(appliesForCommodity('permanentAddress', 'Cow')).toBe(false)
  })

  it('Should apply an anyAllowListed obligation per its commodity list', () => {
    expect(appliesForCommodity('containsUnweanedAnimals', 'Cow')).toBe(true)
    expect(appliesForCommodity('countyParishHoldingCph', 'Fish')).toBe(false)
  })

  it('Should invert for notInUnionOf obligations — free-text identifiers apply only outside the specific-identifier union', () => {
    expect(
      appliesForCommodity('animalIdentifierIdentificationDetails', 'Fish')
    ).toBe(true)
    expect(appliesForCommodity('animalIdentifierDescription', 'Fish')).toBe(
      true
    )
    expect(
      appliesForCommodity('animalIdentifierIdentificationDetails', 'Cow')
    ).toBe(false)
  })

  it('Should treat an unknown commodity as outside every allowlist', () => {
    expect(appliesForCommodity('horseName', 'no-such-commodity')).toBe(false)
    expect(
      appliesForCommodity('animalIdentifierIdentificationDetails', 'Unicorn')
    ).toBe(true)
  })

  it('Should never apply for an obligation with no commodity gate', () => {
    expect(appliesForCommodity('countryOfOrigin', 'Cow')).toBe(false)
    expect(appliesForCommodity('no-such-obligation', 'Cow')).toBe(false)
  })
})
