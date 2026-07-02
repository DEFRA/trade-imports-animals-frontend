import { describe, it, expect } from 'vitest'
import { makeReference } from './reference.js'

describe('lib/quote/reference — deterministic CI-XXXXXX reference', () => {
  it('takes the first 6 hex of the journeyId, uppercased', () => {
    expect(makeReference('3f9a2b7c-1111-4222-8333-444455556666')).toBe(
      'CI-3F9A2B'
    )
  })

  it('re-stamps identically on re-submit (same id, same reference)', () => {
    const journeyId = 'ab12cd34-ef56-4789-9abc-def012345678'
    expect(makeReference(journeyId)).toBe(makeReference(journeyId))
    expect(makeReference(journeyId)).toBe('CI-AB12CD')
  })
})
