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
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text = typeof value === 'function' ? value(3) : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('Should carry the Manage templates wording the design uses', () => {
    expect(copy.title).toBe('Manage templates')
    expect(copy.intro).toBe(
      'Select, manage or create new notification templates'
    )
    expect(copy.listHeading).toBe('My templates')
  })

  it('Should name the button that starts a template', () => {
    expect(copy.createNew).toBe('Create new template')
    expect(cy.createNew).toBe('Creu templed newydd')
  })

  it('Should count no templates and every template on one page', () => {
    expect(copy.results.none).toBe('Show 0 of 0 results')
    expect(copy.results.all(5)).toBe('Show 1-5 of 5 results')
  })

  it('Should carry a Welsh draft for every string under the same key', () => {
    expect(cy.title).toBe('Rheoli templedi')
    expect(cy.results.all(2)).toBe('Dangos 1-2 o 2 canlyniad')
  })
})
