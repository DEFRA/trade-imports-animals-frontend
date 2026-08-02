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

describe('plant-products origin copy', () => {
  it('keeps English and Welsh structure-identical with translated leaves', () => {
    expect(shape(cy)).toEqual(shape(en))
    expect(leaves(cy)).not.toEqual(leaves(en))
  })

  it('provides every country-of-origin page key', () => {
    expect(en.countryOfOrigin).toEqual({
      title: expect.any(String),
      caption: expect.any(String),
      country: {
        label: expect.any(String),
        placeholder: expect.any(String),
        ukGroupLabel: expect.any(String)
      },
      errors: { countryRequired: expect.any(String) }
    })
    for (const leaf of leaves(en)) {
      expect(leaf.trim().length).toBeGreaterThan(0)
    }
  })

  it('provides every origin-of-import page key', () => {
    expect(en.originOfImport).toEqual({
      pageTitle: expect.any(String),
      caption: expect.any(String),
      heading: expect.any(String),
      countryOfConsignment: {
        label: expect.any(String),
        placeholder: expect.any(String)
      },
      internalReference: {
        label: expect.any(String),
        hint: expect.any(String)
      },
      errors: {
        countryOfConsignmentRequired: expect.any(String),
        internalReferenceMaxLength: expect.any(String)
      }
    })
  })
})
