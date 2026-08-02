import { describe, expect, it } from 'vitest'

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

describe('plant-products commodities copy', () => {
  it('keeps English and Welsh structure-identical with translated leaves', () => {
    expect(shape(cy)).toEqual(shape(en))
    expect(leaves(cy)).not.toEqual(leaves(en))
  })

  it('provides every commodity-input-method key with non-empty copy', () => {
    expect(en).toEqual({
      inputMethod: {
        title: expect.any(String),
        caption: expect.any(String),
        heading: expect.any(String),
        options: {
          MANUAL: { label: expect.any(String), hint: expect.any(String) },
          CSV: { label: expect.any(String), hint: expect.any(String) }
        },
        errors: { required: expect.any(String) }
      }
    })
    for (const leaf of leaves(en)) {
      expect(leaf.trim().length).toBeGreaterThan(0)
    }
  })
})
