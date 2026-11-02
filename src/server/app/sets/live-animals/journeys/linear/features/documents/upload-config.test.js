import { describe, expect, it } from 'vitest'

import { attachmentTypes } from '../../../../../../services/document-types/index.js'
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_TYPES,
  allowedFileTypesHint,
  fileTypeMessage,
  attachmentTypeFor,
  exceedsMaxFileSize,
  MAX_FILE_SIZE_BYTES,
  oversizeMessage
} from './upload-config.js'
import { copy as copyEn } from './copy/copy.en.js'
import { copy as copyCy } from './copy/copy.cy.js'

describe('#upload-config', () => {
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
    expect(
      ALLOWED_TYPES.every(({ ext }) => enumValues.has(ext.toUpperCase()))
    ).toBe(true)
  })

  it('Should name every accepted extension in the English hint, including JPG', () => {
    expect(allowedFileTypesHint(copyEn)).toBe(
      'PDF, DOC, DOCX, JPEG, JPG, PNG, XLS or XLSX'
    )
  })

  it('Should join the accepted extensions with the Welsh word for or in the Welsh hint', () => {
    expect(allowedFileTypesHint(copyCy)).toBe(
      'PDF, DOC, DOCX, JPEG, JPG, PNG, XLS neu XLSX'
    )
  })

  it('Should keep the hint in step with what the file input accepts', () => {
    const accepted = ACCEPT_ATTRIBUTE.split(',').map((extension) =>
      extension.replace('.', '').toUpperCase()
    )

    const listed = allowedFileTypesHint(copyEn)
      .replaceAll(' or ', ', ')
      .split(', ')

    expect(listed).toEqual(accepted)
  })

  it('Should hold the 50MB decimal limit and name it in the oversize message', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50000000)
    expect(oversizeMessage(copyEn)).toBe(
      'The selected file must be smaller than 50MB'
    )
  })

  it('Should word the file type error in Welsh, listing the types joined with neu', () => {
    expect(fileTypeMessage(copyCy)).toBe(
      copyCy.errors.fileType('PDF, DOC, DOCX, JPEG, JPG, PNG, XLS neu XLSX')
    )
    expect(fileTypeMessage(copyCy)).not.toBe(fileTypeMessage(copyEn))
  })

  it('Should word the oversize error in Welsh with the size limit', () => {
    expect(oversizeMessage(copyCy)).toBe(copyCy.errors.oversize('50MB'))
    expect(oversizeMessage(copyCy)).not.toBe(oversizeMessage(copyEn))
  })

  it('Should judge a byte count against the shared limit, allowing exactly the limit', () => {
    expect(exceedsMaxFileSize(MAX_FILE_SIZE_BYTES)).toBe(false)
    expect(exceedsMaxFileSize(MAX_FILE_SIZE_BYTES + 1)).toBe(true)
    expect(exceedsMaxFileSize(0)).toBe(false)
  })

  it('Should judge a byte count against a browser-supplied limit', () => {
    expect(exceedsMaxFileSize(1025, 1024)).toBe(true)
    expect(exceedsMaxFileSize(1024, 1024)).toBe(false)
  })

  it('Should not call an unmeasurable byte count oversize', () => {
    expect(exceedsMaxFileSize(undefined)).toBe(false)
    expect(exceedsMaxFileSize(Number.NaN)).toBe(false)
    expect(exceedsMaxFileSize(10, Number.NaN)).toBe(false)
  })
})
