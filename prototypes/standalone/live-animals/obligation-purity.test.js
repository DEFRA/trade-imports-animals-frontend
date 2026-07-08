import { describe, expect, it } from 'vitest'

import {
  assertObligationPurity,
  isReferenceServiceImport,
  isSidewaysObligationImport
} from './obligation-purity.js'

describe('obligation model purity', () => {
  it('Should pass for the real feature obligation files', () => {
    expect(() => assertObligationPurity()).not.toThrow()
  })

  it('Should accept a sideways import of another feature obligations.js', () => {
    expect(isSidewaysObligationImport('../commodities/obligations.js')).toBe(
      true
    )
    expect(isSidewaysObligationImport('../origin/obligations.js')).toBe(true)
  })

  it('Should accept a reference-data service import', () => {
    expect(
      isReferenceServiceImport('../../services/commodities/index.js')
    ).toBe(true)
    expect(isReferenceServiceImport('../../services/ports/index.js')).toBe(true)
  })

  it('Should not treat a service import as a sideways obligations import', () => {
    expect(
      isSidewaysObligationImport('../../services/commodities/index.js')
    ).toBe(false)
    expect(isReferenceServiceImport('../commodities/obligations.js')).toBe(
      false
    )
  })

  it('Should reject any outward import (view, engine, validator, config, package)', () => {
    expect(isSidewaysObligationImport('../../shared/kit.js')).toBe(false)
    expect(isReferenceServiceImport('../../shared/kit.js')).toBe(false)
    expect(isSidewaysObligationImport('../../engine/index.js')).toBe(false)
    expect(isReferenceServiceImport('../../engine/index.js')).toBe(false)
    expect(isSidewaysObligationImport('../../lib/validate/index.js')).toBe(
      false
    )
    expect(isSidewaysObligationImport('../../config.js')).toBe(false)
    expect(isSidewaysObligationImport('joi')).toBe(false)
    expect(isReferenceServiceImport('joi')).toBe(false)
  })
})
