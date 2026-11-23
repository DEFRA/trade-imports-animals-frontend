import { describe, expect, it } from 'vitest'

import { paginationItems } from './page-numbers.js'

const hrefFor = (number) => `/select?page=${number}`

const shapeOf = (page, totalPages) =>
  paginationItems(page, totalPages, hrefFor).map((item) =>
    item.ellipsis ? '…' : item.number
  )

describe('#paginationItems', () => {
  it('Should number every page while they all fit beside the current one', () => {
    expect(shapeOf(1, 3)).toEqual([1, 2, 3])
  })

  it('Should hold the first, last and either side of the current page, with an ellipsis across each gap', () => {
    expect(shapeOf(5, 9)).toEqual([1, '…', 4, 5, 6, '…', 9])
  })

  it('Should skip the ellipsis where the gap is a single page', () => {
    expect(shapeOf(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('Should open each page link with its own page number', () => {
    expect(paginationItems(2, 4, hrefFor)[0]).toEqual({
      number: 1,
      href: '/select?page=1',
      current: false
    })
  })
})
