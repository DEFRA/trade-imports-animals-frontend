import { describe, expect, it } from 'vitest'

import {
  MIN_SEARCH_LENGTH,
  isSearchable,
  normaliseQuery
} from './search-query.js'

describe('#normaliseQuery', () => {
  it('Should trim what the trader typed and treat nothing as empty', () => {
    expect(normaliseQuery('  Bos taurus ')).toBe('Bos taurus')
    expect(normaliseQuery(undefined)).toBe('')
    expect(normaliseQuery(null)).toBe('')
  })
})

describe('#isSearchable', () => {
  it('Should treat a query as searchable only from three trimmed characters', () => {
    expect(MIN_SEARCH_LENGTH).toBe(3)
    expect(isSearchable('Bo')).toBe(false)
    expect(isSearchable('  Bo  ')).toBe(false)
    expect(isSearchable('Bos')).toBe(true)
  })
})
