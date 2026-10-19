import { describe, expect, it } from 'vitest'
import { appliesForCommodity, gateAdmits } from './applicability.js'

describe('#appliesForCommodity', () => {
  it('Should apply an allowListed obligation for a commodity in its list', () => {
    expect(appliesForCommodity('horseName', '0101')).toBe(true)
    expect(appliesForCommodity('animalIdentifierPassport', '0101')).toBe(true)
    expect(appliesForCommodity('permanentAddress', 'Felis catus')).toBe(true)
  })

  it('Should not apply an allowListed obligation for a commodity outside its list', () => {
    expect(appliesForCommodity('horseName', '0102')).toBe(false)
    expect(appliesForCommodity('permanentAddress', 'Felis')).toBe(false)
  })

  // CPH is asked by exemption rather than by inclusion — every consignment is
  // asked for a CPH number except two commodity codes — so horses (0101) are
  // let off and ostriches (01063300), on no other list at all, are asked.
  it('Should apply a notification-level obligation per its commodity list', () => {
    expect(appliesForCommodity('containsUnweanedAnimals', '0102')).toBe(true)
    expect(appliesForCommodity('countyParishHoldingCph', '01063300')).toBe(true)
    expect(appliesForCommodity('countyParishHoldingCph', '0101')).toBe(false)
  })

  it('Should apply no identifier to a commodity on none of the identifier lists', () => {
    for (const identifier of [
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo',
      'animalIdentifierEarTag',
      'horseName'
    ]) {
      expect(appliesForCommodity(identifier, '01063300')).toBe(false)
    }
  })

  it('Should treat an unknown commodity as outside every allowlist', () => {
    expect(appliesForCommodity('horseName', 'no-such-commodity')).toBe(false)
    expect(appliesForCommodity('permanentAddress', 'Unicorn')).toBe(false)
  })

  it('Should never apply for an obligation with no commodity gate', () => {
    expect(appliesForCommodity('countryOfOrigin', '0102')).toBe(false)
    expect(appliesForCommodity('no-such-obligation', '0102')).toBe(false)
  })
})

// The inversion is pinned against the metadata shape directly rather than
// through a named obligation.
describe('#gateAdmits', () => {
  it('Should admit a value its allowlist holds', () => {
    expect(
      gateAdmits({ gateType: 'allowListed', values: ['0102'] }, '0102')
    ).toBe(true)
    expect(
      gateAdmits({ gateType: 'allowListed', values: ['0102'] }, '01063300')
    ).toBe(false)
  })

  it('Should invert for a notInUnionOf complement gate', () => {
    const gate = { gateType: 'notInUnionOf', values: ['0102'] }
    expect(gateAdmits(gate, '01063300')).toBe(true)
    expect(gateAdmits(gate, '0102')).toBe(false)
  })

  it('Should invert for an anyNotInUnionOf complement gate', () => {
    const gate = { gateType: 'anyNotInUnionOf', values: ['0101', '01061900'] }
    expect(gateAdmits(gate, '0103')).toBe(true)
    expect(gateAdmits(gate, '0101')).toBe(false)
  })

  it('Should admit nothing without gate metadata', () => {
    expect(gateAdmits(undefined, '0102')).toBe(false)
    expect(gateAdmits({}, '0102')).toBe(false)
  })
})
