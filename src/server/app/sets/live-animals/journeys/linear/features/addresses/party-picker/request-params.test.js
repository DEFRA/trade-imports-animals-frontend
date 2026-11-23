import { describe, expect, it } from 'vitest'

import { isSearchAction, pageNumber } from './request-params.js'

describe('#pageNumber', () => {
  it('Should read the page a request asks for', () => {
    expect(pageNumber('3')).toBe(3)
  })

  it('Should ask for the first page when the request names no page', () => {
    expect(pageNumber(undefined)).toBe(1)
    expect(pageNumber('')).toBe(1)
  })

  it('Should ask for the first page when the page is not a positive whole number', () => {
    expect(pageNumber('nonsense')).toBe(1)
    expect(pageNumber('0')).toBe(1)
    expect(pageNumber('-2')).toBe(1)
  })
})

describe('#isSearchAction', () => {
  it('Should tell a submitted search from a save', () => {
    expect(isSearchAction({ action: 'search' })).toBe(true)
    expect(isSearchAction({ action: 'save' })).toBe(false)
  })
})
