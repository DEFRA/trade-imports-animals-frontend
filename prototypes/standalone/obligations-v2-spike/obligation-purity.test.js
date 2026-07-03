import { describe, expect, it } from 'vitest'

import {
  assertObligationPurity,
  isSidewaysObligationImport
} from './obligation-purity.js'

/** The per-file model-purity guard (the feature-model re-point of the boot check). */
describe('obligation model purity', () => {
  it('passes for the real feature obligation files', () => {
    expect(() => assertObligationPurity()).not.toThrow()
  })

  it('accepts a sideways import of another feature obligations.js', () => {
    expect(isSidewaysObligationImport('../addons/obligations.js')).toBe(true)
    expect(
      isSidewaysObligationImport('../driving-history/obligations.js')
    ).toBe(true)
  })

  it('rejects any outward import (view, engine, validator, config, package)', () => {
    expect(isSidewaysObligationImport('../../shared/kit.js')).toBe(false)
    expect(isSidewaysObligationImport('../../engine/index.js')).toBe(false)
    expect(isSidewaysObligationImport('../../lib/validate/index.js')).toBe(
      false
    )
    expect(isSidewaysObligationImport('../../config.js')).toBe(false)
    expect(isSidewaysObligationImport('joi')).toBe(false)
  })
})
