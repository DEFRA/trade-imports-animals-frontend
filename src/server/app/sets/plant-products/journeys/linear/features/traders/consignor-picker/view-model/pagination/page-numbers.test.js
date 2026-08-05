import { describe, expect, it } from 'vitest'

import { paginationItems } from './page-numbers.js'

const hrefFor = (number) => `?page=${number}`

const shape = (items) =>
  items.map((item) => (item.ellipsis ? 'ellipsis' : item.number))

describe('consignor picker page numbers', () => {
  // Twelve canned records over five rows a page can only ever make three
  // pages, so the gap cases are proven against synthetic totals instead.
  it('shows every page and no ellipsis for the three-page canned catalogue', () => {
    expect(shape(paginationItems(2, 3, hrefFor))).toEqual([1, 2, 3])
  })

  it.each([
    {
      name: 'the fourth of ten pages, where the first gap is exactly two',
      page: 4,
      expected: [1, 'ellipsis', 3, 4, 5, 'ellipsis', 10]
    },
    {
      name: 'the middle of ten pages',
      page: 5,
      expected: [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
    },
    {
      name: 'the first of ten pages',
      page: 1,
      expected: [1, 2, 'ellipsis', 10]
    },
    {
      name: 'the last of ten pages',
      page: 10,
      expected: [1, 'ellipsis', 9, 10]
    }
  ])('inserts an ellipsis across the gap at $name', ({ page, expected }) => {
    expect(shape(paginationItems(page, 10, hrefFor))).toEqual(expected)
  })

  it('marks exactly one item as current and links every number', () => {
    const items = paginationItems(5, 10, hrefFor)
    const numbered = items.filter((item) => !item.ellipsis)

    expect(items.filter((item) => item.current)).toEqual([
      { number: 5, href: '?page=5', current: true }
    ])
    expect(numbered.map(({ href }) => href)).toEqual(
      numbered.map(({ number }) => `?page=${number}`)
    )
  })
})
