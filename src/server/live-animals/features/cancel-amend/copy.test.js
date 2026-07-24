import { describe, expect, it } from 'vitest'

import { copy } from './copy.en.js'

describe('cancel-amend copy module', () => {
  it('Should keep every copy value non-empty', () => {
    for (const [key, value] of Object.entries(copy)) {
      expect(typeof value, `${key} must be a string`).toBe('string')
      expect(value.trim().length, `${key} must not be empty`).toBeGreaterThan(0)
    }
  })
})
