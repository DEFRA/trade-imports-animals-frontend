import { describe, expect, it } from 'vitest'
import { appliesForGateValue } from './applicability.js'

describe('#appliesForGateValue', () => {
  it('Should apply horseName and passport for commodity code 0101', () => {
    expect(appliesForGateValue('horseName', '0101')).toBe(true)
    expect(appliesForGateValue('animalIdentifierPassport', '0101')).toBe(true)
  })

  it('Should apply permanentAddress for the species Felis catus under 01061900', () => {
    expect(
      appliesForGateValue('permanentAddress', ['01061900', 'Felis catus'])
    ).toBe(true)
  })

  it('Should not apply permanentAddress for the species Felis catus under 0102', () => {
    expect(
      appliesForGateValue('permanentAddress', ['0102', 'Felis catus'])
    ).toBe(false)
  })

  it('Should not apply horseName for commodity code 0102', () => {
    expect(appliesForGateValue('horseName', '0102')).toBe(false)
  })

  it('Should not apply permanentAddress for the genus Felis under 01061900', () => {
    expect(appliesForGateValue('permanentAddress', ['01061900', 'Felis'])).toBe(
      false
    )
  })

  it('Should ask about unweaned animals for cattle (0102)', () => {
    expect(appliesForGateValue('containsUnweanedAnimals', '0102')).toBe(true)
  })

  it('Should ask for CPH for ostriches (01063300) but not for horses (0101)', () => {
    expect(appliesForGateValue('countyParishHoldingCph', '01063300')).toBe(true)
    expect(appliesForGateValue('countyParishHoldingCph', '0101')).toBe(false)
  })

  it('Should apply no identifier for commodity code 01063300', () => {
    for (const identifier of [
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo',
      'animalIdentifierEarTag',
      'horseName'
    ]) {
      expect(appliesForGateValue(identifier, '01063300')).toBe(false)
    }
  })

  it('Should not apply horseName for an unknown commodity code', () => {
    expect(appliesForGateValue('horseName', 'no-such-commodity')).toBe(false)
  })

  it('Should not apply permanentAddress for an unknown species', () => {
    expect(
      appliesForGateValue('permanentAddress', ['01061900', 'Unicorn'])
    ).toBe(false)
  })

  it('Should not apply the CPH number to a line with no commodity code', () => {
    expect(appliesForGateValue('countyParishHoldingCph', undefined)).toBe(false)
    expect(appliesForGateValue('countyParishHoldingCph', '')).toBe(false)
  })

  it('Should never apply an obligation that has no gate', () => {
    expect(appliesForGateValue('countryOfOrigin', '0102')).toBe(false)
    expect(appliesForGateValue('no-such-obligation', '0102')).toBe(false)
  })
})
