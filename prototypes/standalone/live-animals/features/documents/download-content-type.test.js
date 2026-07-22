import { describe, expect, it } from 'vitest'

import {
  resolveContentDisposition,
  resolveDownloadContentType
} from './download-content-type.js'

const headers = (values) => new Headers(values)

describe('#resolveDownloadContentType', () => {
  it('Should keep a type the journey accepts on upload, dropping its parameters', () => {
    expect(
      resolveDownloadContentType(
        headers({ 'content-type': 'application/pdf; charset=binary' })
      )
    ).toBe('application/pdf')
  })

  it('Should match the allow-list regardless of case', () => {
    expect(
      resolveDownloadContentType(headers({ 'content-type': 'IMAGE/JPEG' }))
    ).toBe('image/jpeg')
  })

  it('Should serve a type outside the upload allow-list as octet-stream', () => {
    expect(
      resolveDownloadContentType(headers({ 'content-type': 'text/html' }))
    ).toBe('application/octet-stream')
  })

  it('Should serve octet-stream when no content type comes back', () => {
    expect(resolveDownloadContentType(headers({}))).toBe(
      'application/octet-stream'
    )
  })
})

describe('#resolveContentDisposition', () => {
  it('Should pass the disposition the file was stored with straight through', () => {
    expect(
      resolveContentDisposition(
        headers({ 'content-disposition': 'inline; filename="itahc.pdf"' })
      )
    ).toBe('inline; filename="itahc.pdf"')
  })

  it('Should default to attachment when none comes back', () => {
    expect(resolveContentDisposition(headers({}))).toBe('attachment')
  })
})
