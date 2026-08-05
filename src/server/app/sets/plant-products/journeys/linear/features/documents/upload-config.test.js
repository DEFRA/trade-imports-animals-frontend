import { describe, expect, it } from 'vitest'

import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_FILE_TYPES_HINT,
  ALLOWED_MIME_TYPES,
  ALLOWED_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  MAX_PAYLOAD_BYTES,
  exceedsMaxFileSize,
  isAllowedFilename
} from './upload-config.js'

const JPEG_MIME = 'image/jpeg'

// Verbatim from the backend default at
// repos/trade-imports-animals-backend/src/main/resources/application.yml
// (cdp.uploader.mime-types → CDP_UPLOADER_MIME_TYPES). Widening the frontend
// allowlist without widening that default is the regression this pins.
const BACKEND_CDP_UPLOADER_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  JPEG_MIME,
  'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

// The CDP nginx ingress refuses anything above 10 MiB before Hapi sees it.
const INGRESS_CEILING_BYTES = 10 * 1024 * 1024

const multipartEnvelopeBytes = (filename) => {
  const boundary = `--${'-'.repeat(38)}${'0'.repeat(24)}\r\n`
  const filePart =
    `${boundary}Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'
  const metadataParts = [
    'crumb',
    'action',
    'documentType',
    'documentReference',
    'issueDate-day',
    'issueDate-month',
    'issueDate-year'
  ]
    .map(
      (name) =>
        `${boundary}Content-Disposition: form-data; name="${name}"\r\n\r\n${'x'.repeat(100)}\r\n`
    )
    .join('')
  return `${filePart}\r\n${metadataParts}${boundary}--\r\n`.length
}

describe('plant-products documents upload config', () => {
  it('allows exactly the eight extensions over seven unique MIME types', () => {
    expect(ALLOWED_TYPES).toEqual([
      { ext: 'pdf', mime: 'application/pdf' },
      { ext: 'doc', mime: 'application/msword' },
      {
        ext: 'docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      },
      { ext: 'jpeg', mime: JPEG_MIME },
      { ext: 'jpg', mime: JPEG_MIME },
      { ext: 'png', mime: 'image/png' },
      { ext: 'xls', mime: 'application/vnd.ms-excel' },
      {
        ext: 'xlsx',
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    ])
    expect(ALLOWED_MIME_TYPES).toHaveLength(7)
  })

  it('agrees exactly with the backend cdp-uploader MIME allowlist', () => {
    expect(ALLOWED_MIME_TYPES).toEqual(BACKEND_CDP_UPLOADER_MIME_TYPES)
  })

  it('offers the file input the dot-prefixed extension list', () => {
    expect(ACCEPT_ATTRIBUTE).toBe('.pdf,.doc,.docx,.jpeg,.jpg,.png,.xls,.xlsx')
  })

  it('reads the hint as a GDS disjunction list of deduplicated types', () => {
    expect(ALLOWED_FILE_TYPES_HINT).toBe(
      'PDF, DOC, DOCX, JPEG, PNG, XLS or XLSX'
    )
  })

  it('holds the 10 MB decimal limit and its label', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10000000)
    expect(MAX_FILE_SIZE_LABEL).toBe('10 MB')
  })

  it('admits an at-limit file with a 200-character filename and stays under the ingress ceiling', () => {
    const filename = `${'a'.repeat(195)}.xlsx`

    expect(filename).toHaveLength(200)
    expect(MAX_FILE_SIZE_BYTES + multipartEnvelopeBytes(filename)).toBeLessThan(
      MAX_PAYLOAD_BYTES
    )
    expect(MAX_PAYLOAD_BYTES).toBeLessThan(INGRESS_CEILING_BYTES)
  })

  it('judges a byte count against the limit, allowing exactly the limit', () => {
    expect(exceedsMaxFileSize(10000000)).toBe(false)
    expect(exceedsMaxFileSize(10000001)).toBe(true)
    expect(exceedsMaxFileSize(0)).toBe(false)
  })

  it('does not call an unmeasurable byte count oversize', () => {
    expect(exceedsMaxFileSize(undefined)).toBe(false)
    expect(exceedsMaxFileSize(Number.NaN)).toBe(false)
  })

  it('accepts allowed extensions case-insensitively and refuses the rest', () => {
    expect(isAllowedFilename('phyto.pdf')).toBe(true)
    expect(isAllowedFilename('SCAN.JPEG')).toBe(true)
    expect(isAllowedFilename('archive.zip')).toBe(false)
    expect(isAllowedFilename('noextension')).toBe(false)
    expect(isAllowedFilename('')).toBe(false)
    expect(isAllowedFilename('report.pdf.exe')).toBe(false)
    expect(isAllowedFilename('report.')).toBe(false)
  })
})
