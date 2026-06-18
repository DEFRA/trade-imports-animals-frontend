import { describe, test, expect } from 'vitest'

import {
  ALLOWED_TYPES,
  ALLOWED_FILE_TYPES_HINT,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  OVERSIZE_FILE_MESSAGE,
  MAX_PAYLOAD_BYTES,
  MAX_DOCUMENTS,
  MAX_DOCUMENT_REFERENCE_LENGTH,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_OPTIONS,
  getDocumentTypeLabel
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
    test('MAX_FILE_SIZE_BYTES is exactly 10 MB (decimal)', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10_000_000)
    })

    test('MAX_FILE_SIZE_BYTES stays clear of the 10 MiB CDP nginx ingress cap', () => {
      const TEN_MIB_BYTES = 10 * 1024 * 1024
      expect(MAX_FILE_SIZE_BYTES).toBeLessThan(TEN_MIB_BYTES)
    })

    test('MAX_PAYLOAD_BYTES leaves headroom above MAX_FILE_SIZE_BYTES for the multipart envelope', () => {
      expect(MAX_PAYLOAD_BYTES).toBeGreaterThan(MAX_FILE_SIZE_BYTES)
      expect(MAX_PAYLOAD_BYTES).toBe(MAX_FILE_SIZE_BYTES + 1024)
    })

    test('MAX_FILE_SIZE_LABEL is the user-facing label derived from MAX_FILE_SIZE_BYTES', () => {
      expect(MAX_FILE_SIZE_LABEL).toBe('10 MB')
    })

    test('OVERSIZE_FILE_MESSAGE embeds the derived MAX_FILE_SIZE_LABEL', () => {
      expect(OVERSIZE_FILE_MESSAGE).toBe(
        `The selected file must be smaller than ${MAX_FILE_SIZE_LABEL}`
      )
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

  describe('document type labels', () => {
    test('DOCUMENT_TYPE_OPTIONS exposes value/text pairs for each supported certificate', () => {
      expect(DOCUMENT_TYPE_OPTIONS).toEqual([
        {
          value: 'ITAHC',
          text: 'Intra-Trade Animal Health Certificate (ITAHC)'
        },
        {
          value: 'VETERINARY_HEALTH_CERTIFICATE',
          text: 'Veterinary health certificate'
        }
      ])
    })

    test('getDocumentTypeLabel returns the user-facing text for ITAHC', () => {
      expect(getDocumentTypeLabel('ITAHC')).toBe(
        'Intra-Trade Animal Health Certificate (ITAHC)'
      )
    })

    test('getDocumentTypeLabel returns the user-facing text for VETERINARY_HEALTH_CERTIFICATE', () => {
      expect(getDocumentTypeLabel('VETERINARY_HEALTH_CERTIFICATE')).toBe(
        'Veterinary health certificate'
      )
    })

    test('getDocumentTypeLabel falls back to the raw value for unknown identifiers', () => {
      expect(getDocumentTypeLabel('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE')
    })
  })
})
