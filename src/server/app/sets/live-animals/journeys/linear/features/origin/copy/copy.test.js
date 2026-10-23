import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

describe('#copy', () => {
  it.each([
    ['en', copy],
    ['cy', copyCy]
  ])('Should hold non-empty copy at every %s leaf', (locale, bundle) => {
    for (const { path, value } of leaves(bundle)) {
      expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
    }
  })

  it.each([
    'country',
    'regionRequirement',
    'regionCode',
    'internalReference',
    'errors'
  ])('Should hold the same %s keys in English and Welsh', (block) => {
    expect(Object.keys(copyCy[block]).toSorted()).toEqual(
      Object.keys(copy[block]).toSorted()
    )
  })
})
