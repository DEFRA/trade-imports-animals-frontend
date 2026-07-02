import { describe, it, expect } from 'vitest'
import { calculatePremium } from './premium.js'

/**
 * Parity pinned to the pound against spike-a/lib/premium.js — every
 * expected value below is the formula from parity-facts.json §premium
 * recomputed by hand and commented inline.
 */
describe('lib/quote/premium — the parity-pinned formula', () => {
  it('prices a full comprehensive journey to the pound', () => {
    // (480 + round(12000*0.01)=120) * 1 = 600; +120 claims; +3*15=45 points;
    // -5*25=125 discount; +60+25=85 extras => 725
    expect(
      calculatePremium({
        coverType: 'comprehensive',
        estimatedValue: '12000',
        yearsNoClaims: '5',
        penaltyPoints: '3',
        hadClaims: 'yes',
        extras: ['breakdown', 'legal']
      })
    ).toBe(725)
  })

  it('applies the cover-type multipliers', () => {
    // (480 + 100) * 0.85 = 493
    expect(
      calculatePremium({
        coverType: 'third-party-fire-theft',
        estimatedValue: 10000
      })
    ).toBe(493)
    // (480 + 100) * 0.7 = 406
    expect(
      calculatePremium({ coverType: 'third-party', estimatedValue: 10000 })
    ).toBe(406)
  })

  it('never drops below the £150 floor', () => {
    // 480 * 0.7 = 336; -9*25=225 => 111 -> floored to 150
    expect(
      calculatePremium({ coverType: 'third-party', yearsNoClaims: '9' })
    ).toBe(150)
  })

  it('prices a completely empty (half-finished) journey — ruling b', () => {
    // 480 * 1 = 480, nothing else answered
    expect(calculatePremium({})).toBe(480)
    expect(calculatePremium()).toBe(480)
  })

  it('ignores unknown extras and non-numeric noise', () => {
    // 480 + 60 breakdown; 'soon' coerces to 0 loading
    expect(
      calculatePremium({
        extras: ['breakdown', 'jetpack'],
        penaltyPoints: 'soon'
      })
    ).toBe(540)
  })
})
