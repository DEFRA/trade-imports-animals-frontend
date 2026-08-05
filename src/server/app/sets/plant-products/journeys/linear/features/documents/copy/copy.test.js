import { describe, expect, it } from 'vitest'

import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
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

  it('pins the warning and the metadata validation messages', () => {
    expect(en.insetWarning).toBe(
      'A phytosanitary certificate must be attached to the notification or your consignment will be rejected'
    )
    expect(en.errors.documentTypeRequired).toBe('Select a document type')
    expect(en.errors.referenceRequired).toBe('Enter a reference')
    expect(en.errors.referenceMaxLength).toBe(
      'Document reference must be 100 characters or fewer'
    )
    expect(en.errors.dateRequired).toBe('Enter a date of issue')
    expect(en.errors.dateInvalid).toBe('Date of issue must be a real date')
  })

  it('pins every acceptance-criterion sentence character for character', () => {
    expect(en.errors.uploadFailed).toBe(
      'The file could not be uploaded. Try again.'
    )
    expect(en.errors.virus('phyto.pdf')).toBe(
      'phyto.pdf contains a virus. Remove it and try again with a different file.'
    )
    expect(en.errors.removeFailed).toBe(
      'The document could not be removed. Try again.'
    )
    expect(en.errors.cannotContinue).toBe(
      'You cannot continue until all files have been checked or removed'
    )
    expect(en.errors.maxDocuments(MAX_DOCUMENTS)).toBe(
      `You can add a maximum of ${MAX_DOCUMENTS} documents`
    )
  })

  it('composes the Welsh virus sentence with its own fallback name', () => {
    expect(cy.errors.virus(cy.errors.fileFallbackName)).toBe(
      'Mae ’r ffeil yn cynnwys firws. Tynnwch hi a rhoi cynnig arall arni gyda ffeil wahanol.'
    )
    expect(cy.errors.virus('phyto.pdf')).toBe(
      'Mae phyto.pdf yn cynnwys firws. Tynnwch hi a rhoi cynnig arall arni gyda ffeil wahanol.'
    )
  })

  it('offers no required-file and no minimum-size message', () => {
    const keys = Object.keys(en.errors)

    expect(keys).not.toContain('fileRequired')
    expect(keys).not.toContain('minimumSize')
    expect(
      Object.values(en.errors)
        .filter((message) => typeof message === 'string')
        .join(' ')
    ).not.toMatch(/select a file|at least/i)
  })

  it('names every status the server can render, including the no-file absence', () => {
    expect(en.status).toEqual({
      checking: 'Checking',
      safe: 'Safe',
      virus: 'Contains a virus',
      unavailable: 'Status unavailable',
      noFile: 'No file'
    })
  })

  it('offers the manual refresh link text', () => {
    expect(en.actions.refresh).toBe('Refresh virus scan status')
  })

  it('describes the file as optional in its label and hint', () => {
    expect(en.labels.file).toBe('Upload a file (optional)')
    expect(en.hints.file('PDF or PNG', '10 MB')).toBe(
      'You do not have to upload a file. If you do, it must be a PDF or PNG and smaller than 10 MB.'
    )
  })
})
