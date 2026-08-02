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

const leaves = (value) =>
  Object.values(value).flatMap((child) =>
    child !== null && typeof child === 'object' ? leaves(child) : [child]
  )

describe('plant-products import-type copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('provides every required key with non-empty copy', () => {
    expect(en.importTypes).toHaveProperty('liveAnimals')
    expect(en.importTypes).toHaveProperty('poao')
    expect(en.importTypes).toHaveProperty('hrfnao')
    expect(en.importTypes).toHaveProperty('plantProducts')
    expect(en.errors).toHaveProperty('importTypeRequired')
    expect(en.notAvailable).toMatchObject({
      title: expect.any(String),
      body: expect.any(String),
      changeAnswer: expect.any(String)
    })
    expect(leaves(en).every((leaf) => leaf.trim().length > 0)).toBe(true)
    expect(leaves(cy).every((leaf) => leaf.trim().length > 0)).toBe(true)
  })
})
