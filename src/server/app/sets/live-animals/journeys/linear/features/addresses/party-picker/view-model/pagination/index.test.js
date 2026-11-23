import { describe, expect, it } from 'vitest'

import {
  ADDRESSES_A_PAGE,
  addressesBeforePage,
  addressesOnPage,
  pageCountOf,
  paginationLinks,
  servedPageOf
} from './index.js'

const LABELS = { previous: 'Previous', next: 'Next' }
const PARTY = { slug: 'consignor/select' }
const JOURNEY_ID = 'GBN-AG-26-ABC123'

const addresses = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: `address-${index + 1}` }))

const linksFor = (overrides) =>
  paginationLinks(JOURNEY_ID, PARTY, {
    query: '',
    page: 1,
    totalPages: 3,
    selectedId: '',
    trail: [],
    labels: LABELS,
    ...overrides
  })

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
    const onPage = addressesOnPage(addresses(9), 1)

    expect(onPage.map((record) => record.id)).toEqual([
      'address-1',
      'address-2',
      'address-3',
      'address-4',
      'address-5',
      'address-6',
      'address-7',
      'address-8'
    ])
  })

  it('Should hold what is left on the page after it', () => {
    expect(addressesOnPage(addresses(9), 2).map((record) => record.id)).toEqual(
      ['address-9']
    )
  })
})

describe('#addressesBeforePage', () => {
  it('Should count the addresses the pages before this one hold', () => {
    expect(addressesBeforePage(1)).toBe(0)
    expect(addressesBeforePage(3)).toBe(16)
  })
})

describe('#paginationLinks', () => {
  it('Should offer nothing while one page holds every address', () => {
    expect(linksFor({ totalPages: 1 })).toBeNull()
  })

  it('Should offer next and no previous on the first page', () => {
    const links = linksFor({ page: 1 })

    expect(links.previous).toBeUndefined()
    expect(links.next.href).toContain('page=2')
    expect(links.next.text).toBe(LABELS.next)
  })

  it('Should offer previous and no next on the last page', () => {
    const links = linksFor({ page: 3 })

    expect(links.previous.href).toContain('page=2')
    expect(links.previous.text).toBe(LABELS.previous)
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

  it('Should carry the search term and the ticked address on every page link', () => {
    const links = linksFor({ query: 'kolding', selectedId: 'astra-rosales' })

    for (const item of links.items) {
      expect(item.href).toContain('q=kolding')
      expect(item.href).toContain('selected=astra-rosales')
    }
    expect(links.next.href).toContain('q=kolding')
    expect(links.next.href).toContain('selected=astra-rosales')
  })

  it('Should mark the page being shown as the current item', () => {
    const current = linksFor({ page: 2 }).items.filter((item) => item.current)

    expect(current).toEqual([
      { number: 2, href: expect.stringContaining('page=2'), current: true }
    ])
  })
})
