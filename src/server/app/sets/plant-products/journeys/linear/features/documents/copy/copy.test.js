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

describe('plant-products accompanying-documents copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('pins the warning and canonical validation messages', () => {
    expect(en.insetWarning).toBe(
      'A phytosanitary certificate must be attached to the notification or your consignment will be rejected'
    )
    expect(en.errors).toEqual({
      documentTypeRequired: 'Select a document type',
      referenceRequired: 'Enter a reference',
      referenceMaxLength: 'Document reference must be 100 characters or fewer',
      dateRequired: 'Enter a date of issue',
      dateInvalid: 'Date of issue must be a real date'
    })
  })

  it('provides the complete page and table bundle', () => {
    expect(Object.keys(en)).toEqual([
      'pageTitle',
      'caption',
      'heading',
      'insetWarning',
      'labels',
      'hints',
      'placeholderOption',
      'table',
      'actions',
      'errors'
    ])
    expect(en.table.headings).toEqual(en.labels)
  })
})
