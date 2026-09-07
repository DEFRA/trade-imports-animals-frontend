import { describe, expect, it } from 'vitest'

import { documentRetryDelayMs } from './retry.js'

describe('documentRetryDelayMs', () => {
  it('backs off exponentially up to the cap', () => {
    expect(documentRetryDelayMs(0)).toBe(500)
    expect(documentRetryDelayMs(1)).toBe(1000)
    expect(documentRetryDelayMs(2)).toBe(2000)
    expect(documentRetryDelayMs(3)).toBe(4000)
    expect(documentRetryDelayMs(4)).toBe(5000)
    expect(documentRetryDelayMs(10)).toBe(5000)
  })
})
