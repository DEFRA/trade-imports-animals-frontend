import { describe, expect, it } from 'vitest'
import { appliesForCommodity, gateAdmits } from './applicability.js'

describe('#appliesForCommodity', () => {
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

  // Design release 1 asks for identification only where the commodity has an
  // identifier type of its own. Fish is on none of the allowlists and there is
  // no free-text fallback, so no identifier applies to it at all.
  it('Should apply no identifier to a commodity on none of the identifier lists', () => {
    for (const identifier of [
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo',
      'animalIdentifierEarTag',
      'horseName'
    ]) {
      expect(appliesForCommodity(identifier, 'Fish')).toBe(false)
    }
  })

  it('Should treat an unknown commodity as outside every allowlist', () => {
    expect(appliesForCommodity('horseName', 'no-such-commodity')).toBe(false)
    expect(appliesForCommodity('permanentAddress', 'Unicorn')).toBe(false)
  })

  it('Should never apply for an obligation with no commodity gate', () => {
    expect(appliesForCommodity('countryOfOrigin', 'Cow')).toBe(false)
    expect(appliesForCommodity('no-such-obligation', 'Cow')).toBe(false)
  })
})

// The manifest carries no complement gate today, so the inversion is pinned
// against the metadata shape directly rather than through a named obligation.
describe('#gateAdmits', () => {
  it('Should admit a value its allowlist holds', () => {
    expect(
      gateAdmits({ gateType: 'allowListed', values: ['Cow'] }, 'Cow')
    ).toBe(true)
    expect(
      gateAdmits({ gateType: 'allowListed', values: ['Cow'] }, 'Fish')
    ).toBe(false)
  })

  it('Should invert for a notInUnionOf complement gate', () => {
    const gate = { gateType: 'notInUnionOf', values: ['Cow'] }
    expect(gateAdmits(gate, 'Fish')).toBe(true)
    expect(gateAdmits(gate, 'Cow')).toBe(false)
  })

  it('Should admit nothing without gate metadata', () => {
    expect(gateAdmits(undefined, 'Cow')).toBe(false)
    expect(gateAdmits({}, 'Cow')).toBe(false)
  })
})
