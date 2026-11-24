import { describe, expect, it } from 'vitest'

import {
  ADDRESSES_A_PAGE,
  addressesOnPage,
  pageCountOf,
  paginationLinks,
  servedPageOf
} from './pagination.js'

const LABELS = { previous: 'Previous', next: 'Next' }

const addresses = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: `address-${index + 1}` }))

const hrefFor = (number) => `/select?page=${number}`

const linksFor = (overrides) =>
  paginationLinks(
    { page: 1, totalPages: 3, labels: LABELS, ...overrides },
    hrefFor
  )

const shapeOf = (page, totalPages) =>
  paginationLinks({ page, totalPages, labels: LABELS }, hrefFor).items.map(
    (item) => (item.ellipsis ? '…' : item.number)
  )

describe('#ADDRESSES_A_PAGE', () => {
  it('Should hold eight addresses on a page', () => {
    expect(ADDRESSES_A_PAGE).toBe(8)
  })
})

describe('#pageCountOf', () => {
  it('Should count one page for a list that fits on one, and for an empty list', () => {
    expect(pageCountOf(8)).toBe(1)
    expect(pageCountOf(1)).toBe(1)
    expect(pageCountOf(0)).toBe(1)
  })

  it('Should count a further page for each address past a full one', () => {
    expect(pageCountOf(9)).toBe(2)
    expect(pageCountOf(16)).toBe(2)
    expect(pageCountOf(17)).toBe(3)
  })
})

describe('#servedPageOf', () => {
  it('Should serve the page asked for while the list reaches it', () => {
    expect(servedPageOf(2, 9)).toBe(2)
  })

  it('Should serve the last page when the list stops short of the page asked for', () => {
    expect(servedPageOf(9, 9)).toBe(2)
  })

  it('Should serve the first page when the list is empty', () => {
    expect(servedPageOf(3, 0)).toBe(1)
  })
})

describe('#addressesOnPage', () => {
  it('Should hold the first eight addresses on the first page', () => {
    expect(addressesOnPage(addresses(9), 1).map((record) => record.id)).toEqual(
      [
        'address-1',
        'address-2',
        'address-3',
        'address-4',
        'address-5',
        'address-6',
        'address-7',
        'address-8'
      ]
    )
  })

  it('Should hold what is left on the page after it', () => {
    expect(addressesOnPage(addresses(9), 2).map((record) => record.id)).toEqual(
      ['address-9']
    )
  })
})

describe('#paginationLinks', () => {
  it('Should offer nothing while one page holds every address', () => {
    expect(linksFor({ totalPages: 1 })).toBeNull()
  })

  it('Should offer next and no previous on the first page', () => {
    const links = linksFor({ page: 1 })

    expect(links.previous).toBeUndefined()
    expect(links.next).toEqual({ href: hrefFor(2), text: LABELS.next })
  })

  it('Should offer previous and no next on the last page', () => {
    const links = linksFor({ page: 3 })

    expect(links.previous).toEqual({ href: hrefFor(2), text: LABELS.previous })
    expect(links.next).toBeUndefined()
  })

  it('Should word the paging links in the language the page is in', () => {
    const links = linksFor({
      page: 2,
      labels: { previous: 'Blaenorol', next: 'Nesaf' }
    })

    expect(links.previous.text).toBe('Blaenorol')
    expect(links.next.text).toBe('Nesaf')
  })

  it('Should build every link, previous and next included, from the page it opens', () => {
    const links = linksFor({ page: 2, totalPages: 9 })

    expect(links.previous.href).toBe(hrefFor(1))
    expect(links.next.href).toBe(hrefFor(3))
    for (const numbered of links.items.filter((item) => !item.ellipsis)) {
      expect(numbered.href).toBe(hrefFor(numbered.number))
    }
  })

  it('Should mark the page being shown as the current item', () => {
    const current = linksFor({ page: 2 }).items.filter((item) => item.current)

    expect(current).toEqual([{ number: 2, href: hrefFor(2), current: true }])
  })

  it('Should number every page while they all fit beside the current one', () => {
    expect(shapeOf(1, 3)).toEqual([1, 2, 3])
  })

  it('Should hold the first, last and either side of the current page, with an ellipsis across each gap', () => {
    expect(shapeOf(5, 9)).toEqual([1, '…', 4, 5, 6, '…', 9])
  })

  it('Should show no ellipsis where the pages either side of the current one reach the first and last', () => {
    expect(shapeOf(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('Should stand an ellipsis in for a gap of a single page, as the address book list does', () => {
    expect(shapeOf(4, 5)).toEqual([1, '…', 3, 4, 5])
  })
})
