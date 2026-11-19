import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/copy-test-support.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, copyCy)

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
