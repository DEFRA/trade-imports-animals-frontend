import { describe, expect, it } from 'vitest'

import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copy', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  it('Should carry the template name wording the design uses', () => {
    expect(copy.title).toBe('Enter template name')
    expect(copy.caption).toBe('Create a new template')
    expect(copy.label).toBe('Enter template name')
    expect(copy.cancel).toBe('Cancel and return to manage templates')
  })

  it('Should carry a Welsh draft for every string under the same key', () => {
    expect(cy.title).toBe('Rhowch enw’r templed')
    expect(Object.keys(cy)).toEqual(Object.keys(copy))
  })
})
