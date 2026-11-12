import { describe, expect, it } from 'vitest'
import { appliesForGateValue } from './applicability.js'

const EQUUS_CABALUS = 'Equus cabalus'

describe('#appliesForGateValue', () => {
  it('Should apply horseName for the horse species under 0101, and passport for either species under 0101', () => {
    expect(appliesForGateValue('horseName', '0101', EQUUS_CABALUS)).toBe(true)
    expect(appliesForGateValue('animalIdentifierPassport', '0101')).toBe(true)
  })

  it('Should apply the ear tag for pigs, sheep and goats as well as cattle', () => {
    for (const code of ['0102', '0103', '010410', '010420']) {
      expect(appliesForGateValue('animalIdentifierEarTag', code)).toBe(true)
    }
  })

  it('Should apply permanentAddress for the species Felis catus under 01061900', () => {
    expect(
      appliesForGateValue('permanentAddress', '01061900', 'Felis catus')
    ).toBe(true)
  })

  it('Should not apply permanentAddress for the species Felis catus under 0102', () => {
    expect(appliesForGateValue('permanentAddress', '0102', 'Felis catus')).toBe(
      false
    )
  })

  it('Should not apply horseName for the donkey species under 0101', () => {
    expect(appliesForGateValue('horseName', '0101', 'Equus asinus')).toBe(false)
  })

  it('Should not apply horseName for the horse species under commodity code 0102', () => {
    expect(appliesForGateValue('horseName', '0102', EQUUS_CABALUS)).toBe(false)
  })

  it('Should not apply permanentAddress for the genus Felis under 01061900', () => {
    expect(appliesForGateValue('permanentAddress', '01061900', 'Felis')).toBe(
      false
    )
  })

  it.each(['0101', '0102', '0103', '010410', '010420'])(
    'Should ask about unweaned animals for commodity code %s',
    (code) => {
      expect(appliesForGateValue('containsUnweanedAnimals', code)).toBe(true)
    }
  )

  it('Should not ask about unweaned animals for cats, dogs and ferrets (01061900)', () => {
    expect(appliesForGateValue('containsUnweanedAnimals', '01061900')).toBe(
      false
    )
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
    expect(
      appliesForGateValue('horseName', 'no-such-commodity', EQUUS_CABALUS)
    ).toBe(false)
  })

  it('Should not apply permanentAddress for an unknown species', () => {
    expect(appliesForGateValue('permanentAddress', '01061900', 'Unicorn')).toBe(
      false
    )
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
