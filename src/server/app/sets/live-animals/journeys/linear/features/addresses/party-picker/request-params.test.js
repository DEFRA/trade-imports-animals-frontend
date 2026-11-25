import { describe, expect, it } from 'vitest'

import { isSearchAction } from './request-params.js'

describe('#isSearchAction', () => {
  it('Should tell a submitted search from a save', () => {
    expect(isSearchAction({ action: 'search' })).toBe(true)
    expect(isSearchAction({ action: 'save' })).toBe(false)
  })
})
