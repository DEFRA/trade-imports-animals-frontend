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

const leaves = (value, path = []) =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) =>
        leaves(child, [...path, key])
      )
    : [{ path: path.join('.'), value }]

describe('plant-products dashboard copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it.each([
    ['English', en],
    ['Welsh', cy]
  ])(
    'has a non-empty string-returning %s leaf at every path',
    (_name, copy) => {
      for (const { path, value } of leaves(copy)) {
        const text = typeof value === 'function' ? value(1, 2, 3) : value
        expect(typeof text, path).toBe('string')
        expect(text.trim().length, path).toBeGreaterThan(0)
      }
    }
  )

  it('pins the one status vocabulary and canonical validation copy', () => {
    expect(en.statuses).toEqual({
      draft: 'Draft',
      submitted: 'Submitted',
      amend: 'Amend in progress'
    })
    expect(en.errors).toEqual({
      keywordsMax: 'Search term must be 255 characters or fewer',
      startDateReal: 'Start date must be a real date',
      endDateReal: 'End date must be a real date',
      startBeforeEnd:
        'The start date must be the same as or before the end date'
    })
  })

  it('pins empty, singular and plural result labels', () => {
    expect(en.pagination.results.none).toBe('0 results')
    expect(en.pagination.results.single).toBe('1 result')
    expect(en.pagination.results.range(1, 25, 26)).toBe(
      'Showing 1 to 25 of 26 results'
    )
    expect(en.search.noResults).toBe('No notifications found')
  })

  it('provides the dashboard and list vocabulary', () => {
    expect(en).toMatchObject({
      title: expect.any(String),
      createButton: expect.any(String),
      statuses: {
        draft: expect.any(String),
        submitted: expect.any(String),
        amend: expect.any(String)
      },
      table: {
        headings: {
          reference: expect.any(String),
          status: expect.any(String),
          actions: expect.any(String)
        }
      }
    })
  })
})
