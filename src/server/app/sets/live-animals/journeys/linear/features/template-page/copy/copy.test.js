import { describe, expect, it } from 'vitest'

import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const WEEKLY_CATTLE = 'Weekly cattle'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copy', () => {
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text = typeof value === 'function' ? value('1 May 2026') : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('Should carry the template page wording the design uses', () => {
    expect(copy.caption).toBe('Templates')
    expect(copy.dateCreated('11 September 2026')).toBe(
      'Date created: 11 September 2026'
    )
    expect(copy.useTemplate).toBe('Use template')
    expect(copy.delete).toBe('Delete')
  })

  it('Should confirm a changed template in English and in Welsh', () => {
    expect(copy.updated.title).toBe('Success')
    expect(copy.updated.heading(WEEKLY_CATTLE)).toBe(
      'Weekly cattle has been updated'
    )
    expect(copy.updated.unnamedHeading).toBe('Template has been updated')
    expect(cy.updated.title).not.toBe(copy.updated.title)
    expect(cy.updated.heading(WEEKLY_CATTLE)).not.toBe(
      copy.updated.heading(WEEKLY_CATTLE)
    )
    expect(cy.updated.unnamedHeading).not.toBe(copy.updated.unnamedHeading)
  })

  it('Should carry a Welsh draft for every string under the same key', () => {
    expect(cy.caption).toBe('Templedi')
    expect(cy.dateCreated('11 September 2026')).toBe(
      'Dyddiad creu: 11 September 2026'
    )
    expect(cy.useTemplate).toBe('Defnyddio’r templed')
    expect(cy.delete).toBe('Dileu')
  })
})
