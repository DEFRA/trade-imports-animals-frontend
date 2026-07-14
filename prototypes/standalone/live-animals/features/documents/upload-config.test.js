import { describe, expect, it } from 'vitest'

import { attachmentTypes } from '../../services/document-types/index.js'
import {
  ALLOWED_TYPES,
  ALLOWED_FILE_TYPES_HINT,
  attachmentTypeFor,
  MAX_FILE_SIZE_BYTES,
  MAX_PAYLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE
} from './upload-config.js'

describe('documents upload config', () => {
  it('Should derive the attachment type from the file extension, case-insensitively', () => {
    expect(attachmentTypeFor('invoice.pdf')).toBe('PDF')
    expect(attachmentTypeFor('SCAN.JPEG')).toBe('JPEG')
    expect(attachmentTypeFor('ledger.xlsx')).toBe('XLSX')
  })

  it('Should refuse extensions outside the allow-list and extensionless names', () => {
    expect(attachmentTypeFor('archive.zip')).toBeNull()
    expect(attachmentTypeFor('noextension')).toBeNull()
    expect(attachmentTypeFor('')).toBeNull()
  })

  it('Should keep every derivable attachment type inside the document-types service enum', () => {
    const enumValues = new Set(attachmentTypes())
    for (const { ext } of ALLOWED_TYPES) {
      expect(enumValues.has(ext.toUpperCase())).toBe(true)
    }
  })

  it('Should de-duplicate shared MIME types in the user-facing hint', () => {
    expect(ALLOWED_FILE_TYPES_HINT).toBe(
      'PDF, DOC, DOCX, JPEG, PNG, XLS or XLSX'
    )
  })

  it('Should hold the ruled 50MB limit with multipart headroom on the route cap', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50000000)
    expect(MAX_PAYLOAD_BYTES).toBe(50001024)
    expect(OVERSIZE_FILE_MESSAGE).toBe(
      'The selected file must be smaller than 50MB'
    )
  })
})
