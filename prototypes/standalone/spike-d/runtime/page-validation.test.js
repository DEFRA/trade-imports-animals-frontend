import { describe, it, expect } from 'vitest'
import { contract } from './index.js'

describe('spike-d page-slice (pick + within-page if/then)', () => {
  it('requires excessAmount only when voluntaryExcess = yes', () => {
    expect(
      contract.validate('cover-type', {
        coverType: 'comprehensive',
        voluntaryExcess: 'yes'
      }).ok
    ).toBe(false)
    expect(
      contract.validate('cover-type', {
        coverType: 'comprehensive',
        voluntaryExcess: 'yes',
        excessAmount: '250'
      }).ok
    ).toBe(true)
  })

  it('rejects a malformed formatted string', () => {
    expect(contract.validate('your-vehicle', { registration: 'NOPE' }).ok).toBe(
      false
    )
  })
})
