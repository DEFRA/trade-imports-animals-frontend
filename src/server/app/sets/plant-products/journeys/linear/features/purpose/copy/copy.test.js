import { describe, expect, it } from 'vitest'

import { purposeOptions } from '../../../../../services/reference/purposes.js'
import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

const leaves = (value) =>
  typeof value === 'object' && value !== null
    ? Object.values(value).flatMap(leaves)
    : [value]

describe('plant-products purpose copy', () => {
  it('keeps English and Welsh structure-identical with translated leaves', () => {
    expect(shape(cy)).toEqual(shape(en))
    expect(leaves(cy)).not.toEqual(leaves(en))
  })

  it('provides every page key with non-empty copy', () => {
    expect(en).toEqual({
      title: expect.any(String),
      caption: expect.any(String),
      legend: expect.any(String),
      reasonHints: {
        INTERNAL_MARKET: expect.any(String),
        RE_ENTRY: expect.any(String)
      },
      errors: { reasonForImportRequired: expect.any(String) }
    })
    for (const leaf of leaves(en)) {
      expect(leaf.trim().length).toBeGreaterThan(0)
    }
  })

  it('hints exactly the first two canonical purpose options', () => {
    expect(
      purposeOptions.map(({ value }) => ({
        value,
        hasHint: Object.hasOwn(en.reasonHints, value)
      }))
    ).toEqual([
      { value: 'INTERNAL_MARKET', hasHint: true },
      { value: 'RE_ENTRY', hasHint: true },
      { value: 'RE_CONFORMITY_CHECK', hasHint: false }
    ])
  })
})
