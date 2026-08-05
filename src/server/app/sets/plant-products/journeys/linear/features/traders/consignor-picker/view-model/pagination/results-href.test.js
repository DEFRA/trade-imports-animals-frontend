import { describe, expect, it } from 'vitest'

import {
  registerSetMount,
  withSetContext
} from '../../../../../../../../../shared/set-context.js'
import { resultsHref } from './results-href.js'

registerSetMount('plant-products', '/plant-products')

const hrefFor = (options) =>
  withSetContext('plant-products', () => resultsHref('j-1', options))

describe('consignor picker results href', () => {
  it('points at the picker under the plant-products prefix for that journey', () => {
    expect(hrefFor({ query: '', page: 2 })).toBe(
      '/plant-products/notifications/j-1/consignor-select?page=2'
    )
  })

  it('always carries the page, even the first', () => {
    expect(hrefFor({ page: 1 })).toContain('page=1')
  })

  it('omits an empty query and encodes one with spaces and an ampersand', () => {
    expect(hrefFor({ query: '', page: 1 })).not.toContain('q=')
    expect(hrefFor({ query: 'Orchard & Vine SAS', page: 1 })).toContain(
      'q=Orchard+%26+Vine+SAS'
    )
  })

  it('carries the selection only when there is one', () => {
    expect(hrefFor({ query: 'orchard', page: 3 })).not.toContain('selected=')
    expect(
      hrefFor({ query: 'orchard', page: 3, selectedId: 'example-consignor-07' })
    ).toBe(
      '/plant-products/notifications/j-1/consignor-select?q=orchard&page=3&selected=example-consignor-07'
    )
  })
})
