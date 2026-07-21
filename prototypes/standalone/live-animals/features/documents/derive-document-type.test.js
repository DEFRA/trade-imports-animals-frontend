import { describe, expect, it } from 'vitest'

import * as documentTypes from '../../services/document-types/index.js'
import { deriveDocumentTypeFromFilename } from './derive-document-type.js'

describe('deriveDocumentTypeFromFilename', () => {
  it('Should derive a type from its tokens in the filename', () => {
    expect(deriveDocumentTypeFromFilename('itahc-scan.pdf')).toBe('ITAHC')
    expect(deriveDocumentTypeFromFilename('health_certificate_2026.docx')).toBe(
      'Health certificate'
    )
    expect(deriveDocumentTypeFromFilename('My Journey Log.PDF')).toBe(
      'Journey log'
    )
  })

  it('Should prefer the longest matching type over its substring', () => {
    expect(
      deriveDocumentTypeFromFilename('veterinary-health-certificate.pdf')
    ).toBe('Veterinary health certificate')
  })

  it('Should match a label without its parenthetical qualifier', () => {
    expect(deriveDocumentTypeFromFilename('letter-of-authority.pdf')).toBe(
      'Letter of authority (Directive 2008/61/EC)'
    )
  })

  it('Should not match partial words', () => {
    expect(deriveDocumentTypeFromFilename('itahcx.pdf')).toBe('Other')
  })

  it('Should fall back to Other for an unrecognised filename', () => {
    expect(deriveDocumentTypeFromFilename('holiday-photo.png')).toBe('Other')
    expect(deriveDocumentTypeFromFilename('')).toBe('Other')
    expect(deriveDocumentTypeFromFilename()).toBe('Other')
  })

  it('Should always derive a member of the document-types service list', () => {
    const list = documentTypes.documentTypes()
    for (const filename of [
      'itahc.pdf',
      'air-waybill.docx',
      'random-notes.xlsx',
      'catch certificate.png'
    ]) {
      expect(list).toContain(deriveDocumentTypeFromFilename(filename))
    }
  })
})
