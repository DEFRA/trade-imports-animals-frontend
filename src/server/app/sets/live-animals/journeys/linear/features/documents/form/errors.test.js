import { describe, expect, it } from 'vitest'

import {
  FILE_DOWNLOAD_FAILED,
  FILE_EMPTY,
  FILE_ERROR_CODES,
  FILE_INVALID_TYPE,
  FILE_TOO_LARGE,
  FILE_UPLOAD_FAILED,
  FILE_VIRUS
} from '../../../../../../../services/cdp-uploader/file-error-codes.js'
import { copy as en } from '../copy/copy.en.js'
import { FILE_TYPE_MESSAGE, OVERSIZE_FILE_MESSAGE } from '../upload-config.js'
import { MESSAGE_BY_FILE_ERROR_CODE, submittedFileError } from './errors.js'

const refusedFile = (errorCode) => ({
  filename: 'certificate.pdf',
  hasError: true,
  errorCode
})

describe('submittedFileError', () => {
  it.each([
    [FILE_VIRUS, en.errors.fileVirus],
    [FILE_EMPTY, en.errors.fileEmpty],
    [FILE_TOO_LARGE, OVERSIZE_FILE_MESSAGE],
    [FILE_INVALID_TYPE, FILE_TYPE_MESSAGE],
    [FILE_UPLOAD_FAILED, en.errors.uploadFailed],
    [FILE_DOWNLOAD_FAILED, en.errors.fileDownloadFailed]
  ])('answers %s with the message written for it', (errorCode, message) => {
    expect(submittedFileError(refusedFile(errorCode))).toEqual({
      file: message
    })
  })

  it('gives every code the upload service declares a message of its own', () => {
    const answered = FILE_ERROR_CODES.map(
      (code) => submittedFileError(refusedFile(code)).file
    )

    expect(Object.keys(MESSAGE_BY_FILE_ERROR_CODE).sort()).toEqual(
      [...FILE_ERROR_CODES].sort()
    )
    expect(new Set(answered).size).toBe(FILE_ERROR_CODES.length)
  })

  it('does not invite a retry of a file that holds a virus', () => {
    const { file } = submittedFileError(refusedFile(FILE_VIRUS))

    expect(file).toBe(en.errors.fileVirus)
    expect(file).not.toBe(en.errors.uploadFailed)
  })

  it('falls back to the retry message for a code it does not recognise', () => {
    expect(submittedFileError(refusedFile('FILE_SOMETHING_NEW'))).toEqual({
      file: en.errors.uploadFailed
    })
  })

  it('asks for a file when none was submitted', () => {
    expect(submittedFileError(undefined)).toEqual({
      file: en.errors.fileRequired
    })
  })

  it('refuses an empty file the service reported no error for', () => {
    expect(
      submittedFileError({ filename: 'empty.pdf', contentLength: 0 })
    ).toEqual({ file: en.errors.fileEmpty })
  })

  it('takes on a file the service accepted', () => {
    expect(
      submittedFileError({ filename: 'certificate.pdf', contentLength: 2048 })
    ).toEqual({})
  })
})
