import { describe, test, expect } from 'vitest'

import {
  ALLOWED_TYPES,
  ALLOWED_FILE_TYPES_HINT,
  MAX_FILE_SIZE_BYTES,
  MAX_PAYLOAD_BYTES,
  MAX_DOCUMENTS,
  MAX_DOCUMENT_REFERENCE_LENGTH,
  DOCUMENT_TYPES
} from './document-upload-config.js'

describe('document-upload-config', () => {
  describe('ALLOWED_TYPES', () => {
    test('exposes the exact set of permitted ext/mime pairs', () => {
      expect(ALLOWED_TYPES).toEqual([
        { ext: 'pdf', mime: 'application/pdf' },
        { ext: 'doc', mime: 'application/msword' },
        {
          ext: 'docx',
          mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        },
        { ext: 'jpeg', mime: 'image/jpeg' },
        { ext: 'jpg', mime: 'image/jpeg' },
        { ext: 'png', mime: 'image/png' },
        { ext: 'xls', mime: 'application/vnd.ms-excel' },
        {
          ext: 'xlsx',
          mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ])
    })

    test('ALLOWED_FILE_TYPES_HINT lists every MIME-distinct extension exactly once, joined with "or"', () => {
      // De-duplicated by MIME, so JPEG appears once and JPG is collapsed away.
      expect(ALLOWED_FILE_TYPES_HINT).toBe(
        'PDF, DOC, DOCX, JPEG, PNG, XLS or XLSX'
      )
    })
  })

  describe('size limits', () => {
    test('MAX_FILE_SIZE_BYTES is exactly 50 MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(52_428_800)
    })

    test('MAX_PAYLOAD_BYTES leaves headroom above MAX_FILE_SIZE_BYTES for the multipart envelope', () => {
      expect(MAX_PAYLOAD_BYTES).toBeGreaterThan(MAX_FILE_SIZE_BYTES)
      expect(MAX_PAYLOAD_BYTES).toBe(MAX_FILE_SIZE_BYTES + 1024)
    })
  })

  describe('document constraints', () => {
    test('MAX_DOCUMENTS caps the number of uploads at 10', () => {
      expect(MAX_DOCUMENTS).toBe(10)
    })

    test('MAX_DOCUMENT_REFERENCE_LENGTH caps the reference field at 100 characters', () => {
      expect(MAX_DOCUMENT_REFERENCE_LENGTH).toBe(100)
    })

    test('DOCUMENT_TYPES contains the supported certificate identifiers', () => {
      expect(DOCUMENT_TYPES).toEqual(['ITAHC', 'VETERINARY_HEALTH_CERTIFICATE'])
    })
  })
})
