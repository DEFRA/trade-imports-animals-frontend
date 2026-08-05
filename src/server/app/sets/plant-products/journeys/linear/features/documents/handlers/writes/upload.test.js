import { describe, expect, it } from 'vitest'

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../../upload-config.js'
import { isoDate, uploadDetails } from './upload.js'

describe('plant-products documents upload details', () => {
  it('zero-pads day and month into a year-month-day ISO date', () => {
    expect(isoDate({ day: '3', month: '5', year: '2026' })).toBe('2026-05-03')
  })

  it('keeps a two-digit day and month in their own slots', () => {
    expect(isoDate({ day: '27', month: '12', year: '2026' })).toBe('2026-12-27')
  })

  it('carries the entry, the file and the journey through to the adapter call', () => {
    const details = uploadDetails(
      { journeyId: 'GBN-PP-26-ABC001' },
      {
        documentType: 'PHYTOSANITARY_CERTIFICATE',
        documentReference: 'PHYTO-001',
        issueDate: { day: '4', month: '12', year: '2025' }
      },
      {
        filename: 'phyto.pdf',
        headers: { 'content-type': 'application/pdf' },
        payload: Buffer.from('%PDF-1.4 phyto bytes')
      }
    )

    expect(details).toEqual({
      journeyId: 'GBN-PP-26-ABC001',
      filename: 'phyto.pdf',
      contentType: 'application/pdf',
      bytes: Buffer.from('%PDF-1.4 phyto bytes'),
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      documentReference: 'PHYTO-001',
      dateOfIssue: '2025-12-04',
      maxFileSize: MAX_FILE_SIZE_BYTES,
      mimeTypes: ALLOWED_MIME_TYPES
    })
  })
})
