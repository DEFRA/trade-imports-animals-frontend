import { describe, expect, it } from 'vitest'

import {
  registerSetMount,
  withSetContext
} from '../../../../../../../../../shared/set-context.js'
import { pagination } from './index.js'

registerSetMount('plant-products', '/plant-products')

const paginationFor = (options) =>
  withSetContext('plant-products', () => pagination('j-1', options))

const everyHref = (built) =>
  [
    built.previous?.href,
    built.next?.href,
    ...built.items.map((item) => item.href)
  ].filter((href) => href)

describe('consignor picker pagination', () => {
  it('renders nothing at all below two pages', () => {
    expect(paginationFor({ query: '', page: 1, totalPages: 1 })).toBeNull()
  })

  it('offers next but not previous on the first of three pages', () => {
    const built = paginationFor({ query: '', page: 1, totalPages: 3 })

    expect(built.previous).toBeUndefined()
    expect(built.next.href).toContain('page=2')
  })

  it('offers previous but not next on the last of three pages', () => {
    const built = paginationFor({ query: '', page: 3, totalPages: 3 })

    expect(built.previous.href).toContain('page=2')
    expect(built.next).toBeUndefined()
  })

  it('carries the current query and selection through every generated link', () => {
    const built = paginationFor({
      query: 'example city',
      page: 2,
      totalPages: 3,
      selectedId: 'example-consignor-11'
    })

    expect(built.previous.href).toContain('page=1')
    expect(built.next.href).toContain('page=3')

    for (const href of everyHref(built)) {
      expect(href).toContain('q=example+city')
      expect(href).toContain('selected=example-consignor-11')
      expect(href).toMatch(
        /^\/plant-products\/notifications\/j-1\/consignor-select\?/
      )
    }
  })
})
