import { describe, expect, it } from 'vitest'

import {
  assertObligationPurity,
  isSidewaysObligationImport
} from './obligation-purity.js'

describe('obligation model purity', () => {
  it('Should pass for the real feature obligation files', () => {
    expect(() => assertObligationPurity()).not.toThrow()
  })

  it('Should accept a sideways import of another feature obligations.js', () => {
    expect(isSidewaysObligationImport('../addons/obligations.js')).toBe(true)
    expect(isSidewaysObligationImport('../origin/obligations.js')).toBe(true)
  })

  it('Should reject any outward import (view, engine, validator, config, package)', () => {
    expect(isSidewaysObligationImport('../../shared/kit.js')).toBe(false)
    expect(isSidewaysObligationImport('../../engine/index.js')).toBe(false)
    expect(isSidewaysObligationImport('../../lib/validate/index.js')).toBe(
      false
    )
    expect(isSidewaysObligationImport('../../config.js')).toBe(false)
    expect(isSidewaysObligationImport('joi')).toBe(false)
  })
})
