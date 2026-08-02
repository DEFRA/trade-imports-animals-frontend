// Copy contract from docs/add-a-set.md step 7.
import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

describe('plant-products hub copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('provides the complete task status vocabulary', () => {
    expect(Object.keys(en.statuses)).toEqual([
      'completed',
      'inProgress',
      'notYetStarted',
      'optional',
      'cannotStartYet'
    ])
    expect(en.review).toMatchObject({
      title: expect.any(String),
      hint: expect.any(String)
    })
    expect(en.captions.checkAndSubmit).toEqual(expect.any(String))
  })
})
