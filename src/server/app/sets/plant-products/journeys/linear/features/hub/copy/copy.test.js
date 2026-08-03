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

  it('provides the numbered origin group and its hint-free row', () => {
    expect(en.groups.origin).toBe('1. Origin of the import')
    expect(en.rows.origin).toEqual({ title: 'Origin of the import' })
  })

  it('provides the numbered purpose group and its row copy', () => {
    expect(en.groups.purpose).toBe('2. Purpose')
    expect(en.rows.purpose).toEqual({
      title: 'Purpose',
      hint: 'The main reason for importing the consignment'
    })
  })

  it('provides the numbered commodity group and its row copy', () => {
    expect(en.groups.commodities).toBe('3. Commodity')
    expect(en.rows.commodities).toEqual({
      title: 'Commodity',
      hint: 'The commodities, species and quantities you are importing'
    })
  })

  it('provides the numbered additional-details group and its row copy', () => {
    expect(en.groups['additional-details']).toBe('4. Additional details')
    expect(en.rows['additional-details']).toEqual({
      title: 'Additional details',
      hint: 'Total gross weight and volume of the consignment'
    })
  })

  it('provides the numbered transport group and its row copy', () => {
    expect(en.groups.transport).toBe('5. Transport to the BCP')
    expect(en.rows.transport).toEqual({
      title: 'Transport to the BCP',
      hint: 'How the consignment will travel to the border control post'
    })
  })
})
