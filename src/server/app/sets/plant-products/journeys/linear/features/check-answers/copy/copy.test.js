import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

describe('plant-products check-answers copy', () => {
  it.each([
    ['English', en],
    ['Welsh', cy]
  ])('%s has a resolvable copy leaf at every path', (_language, bundle) => {
    for (const { path, value } of leaves(bundle)) {
      expect(isCopyLeaf(value), `${path} must be copy`).toBe(true)
    }
  })

  it('keeps locale structure identical and exposes the review-specific copy', () => {
    expect(leaves(cy).map(({ path }) => path)).toEqual(
      leaves(en).map(({ path }) => path)
    )
    expect(en.title).toBe('Review your notification')
    expect(en.cards.nominatedContacts.empty).toBe('No nominated contacts added')
    expect(en.cards.transport.rows.containerNumber(2)).toBe(
      'Container 2 number'
    )
  })
})
