import { describe, expect, it } from 'vitest'

import * as documentTypes from '../../services/document-types/index.js'
import { deriveDocumentTypeFromFilename } from './derive-document-type.js'

describe('#deriveDocumentTypeFromFilename', () => {
  it('Should derive an enum code from its tokens in the filename', () => {
    expect(deriveDocumentTypeFromFilename('itahc-scan.pdf')).toBe('ITAHC')
    expect(deriveDocumentTypeFromFilename('health_certificate_2026.docx')).toBe(
      'HEALTH_CERTIFICATE'
    )
    expect(deriveDocumentTypeFromFilename('My Journey Log.PDF')).toBe(
      'JOURNEY_LOG'
    )
  })

  it('Should prefer the longest matching code over its substring', () => {
    expect(
      deriveDocumentTypeFromFilename('veterinary-health-certificate.pdf')
    ).toBe('VETERINARY_HEALTH_CERTIFICATE')
  })

  it("Should not require the display label's parenthetical qualifier in the filename", () => {
    expect(deriveDocumentTypeFromFilename('letter-of-authority.pdf')).toBe(
      'LETTER_OF_AUTHORITY'
    )
  })

  it('Should not match partial words', () => {
    expect(deriveDocumentTypeFromFilename('itahcx.pdf')).toBe('OTHER')
  })

  it('Should fall back to OTHER for an unrecognised filename', () => {
    expect(deriveDocumentTypeFromFilename('holiday-photo.png')).toBe('OTHER')
    expect(deriveDocumentTypeFromFilename('')).toBe('OTHER')
    expect(deriveDocumentTypeFromFilename()).toBe('OTHER')
  })

  it('Should always derive a member of the document-types service enum', () => {
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
