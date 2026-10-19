import { describe, expect, it } from 'vitest'

import {
  MIN_SEARCH_LENGTH,
  SEARCH_PAGE_SIZE,
  isSearchable,
  normaliseQuery
} from './matching.js'

const BOS_TAURUS = 'Bos taurus'

describe('#normaliseQuery', () => {
  it('Should trim what the trader typed and treat nothing as empty', () => {
    expect(normaliseQuery('  Bos taurus ')).toBe(BOS_TAURUS)
    expect(normaliseQuery(undefined)).toBe('')
    expect(normaliseQuery(null)).toBe('')
  })
})

describe('#isSearchable', () => {
  it('Should hold results back until three characters are entered', () => {
    expect(MIN_SEARCH_LENGTH).toBe(3)
    expect(isSearchable('Bo')).toBe(false)
    expect(isSearchable('  Bo  ')).toBe(false)
    expect(isSearchable('Bos')).toBe(true)
  })
})

describe('SEARCH_PAGE_SIZE', () => {
  it('Should list ten species a search', () => {
    expect(SEARCH_PAGE_SIZE).toBe(10)
  })
})
