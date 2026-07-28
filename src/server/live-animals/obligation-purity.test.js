import { describe, expect, it } from 'vitest'

import { assertObligationPurity } from './obligation-purity.js'

describe('obligation model purity', () => {
  it('Should pass for the real model (no display keys)', () => {
    expect(() => assertObligationPurity()).not.toThrow()
  })
})
