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
      'optional',
      'inProgress',
      'notYetStarted',
      'cannotStartYet'
    ])
    expect(en.intro).toEqual(expect.any(String))
    expect(en.returnToDashboard).toEqual(expect.any(String))
  })

  it('provides every numbered hub group in canonical order', () => {
    expect(Object.entries(en.groups)).toEqual([
      ['origin', '1. Origin of the import'],
      ['purpose', '2. Purpose'],
      ['commodities', '3. Commodity'],
      ['additional-details', '4. Additional details'],
      ['transport', '5. Transport to the BCP'],
      ['documents', '9. Accompanying documents'],
      ['review', '12. Review and submit']
    ])
  })

  it('provides non-empty title and hint copy for every hub row', () => {
    expect(Object.keys(en.rows)).toEqual(Object.keys(en.groups))
    for (const row of Object.values(en.rows)) {
      expect(row.title).toEqual(expect.any(String))
      expect(row.title).not.toBe('')
      expect(row.hint).toEqual(expect.any(String))
      expect(row.hint).not.toBe('')
    }
  })

  it('provides the numbered origin group and its row copy', () => {
    expect(en.groups.origin).toBe('1. Origin of the import')
    expect(en.rows.origin).toEqual({
      title: 'Origin of the import',
      hint: 'Where the consignment comes from and your internal reference'
    })
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

  it('provides the numbered documents group and its mandatory row copy', () => {
    expect(en.groups.documents).toBe('9. Accompanying documents')
    expect(en.rows.documents).toEqual({
      title: 'Accompanying documents',
      hint: 'Add at least one document, including the phytosanitary certificate'
    })
  })

  it('provides the canonical review group and its section copy', () => {
    expect(en.groups.review).toBe('12. Review and submit')
    expect(en.rows.review).toEqual({
      title: 'Review and submit',
      hint: 'Check your answers before you submit the notification'
    })
  })
})
