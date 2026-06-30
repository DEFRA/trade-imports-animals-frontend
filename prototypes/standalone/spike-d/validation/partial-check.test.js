import { describe, it, expect } from 'vitest'
import { check } from './index.js'

describe('spike-d partial validation — missing vs invalid', () => {
  it('separates not-answered (missing) from answered-wrongly (invalid)', () => {
    const result = check({
      registration: 'AB12 CDE',
      hadClaims: 'no',
      coverType: 'comprehensive',
      extras: ['breakdown'],
      postcode: 'NOPE'
    })
    expect(result.missing.map((m) => m.path)).toContain('fullName')
    expect(result.invalid.map((i) => i.path)).toContain('postcode')
  })

  it('makes claims required (missing) only when hadClaims = yes', () => {
    expect(check({ hadClaims: 'yes' }).missing.map((m) => m.path)).toContain(
      'claims'
    )
    expect(check({ hadClaims: 'no' }).missing.map((m) => m.path)).not.toContain(
      'claims'
    )
  })

  it('reconstructs provenance from the if/then that fired', () => {
    const claims = check({ hadClaims: 'yes' }).missing.find(
      (m) => m.path === 'claims'
    )
    expect(claims.because).toEqual([{ field: 'hadClaims', eq: 'yes' }])
  })
})
