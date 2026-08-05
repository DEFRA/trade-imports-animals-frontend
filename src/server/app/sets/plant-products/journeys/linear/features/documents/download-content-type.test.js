import { describe, expect, it } from 'vitest'

import {
  resolveContentDisposition,
  resolveDownloadContentType
} from './download-content-type.js'
import { ALLOWED_MIME_TYPES } from './upload-config.js'

const headers = (values) => new Headers(values)

describe('plant-products document download content type', () => {
  it.each(ALLOWED_MIME_TYPES)(
    'serves %s unchanged because the journey accepts it on upload',
    (mimeType) => {
      expect(
        resolveDownloadContentType(headers({ 'content-type': mimeType }))
      ).toBe(mimeType)
    }
  )

  it('drops the parameters from a type the journey accepts', () => {
    expect(
      resolveDownloadContentType(
        headers({ 'content-type': 'application/pdf; charset=utf-8' })
      )
    ).toBe('application/pdf')
  })

  it('tolerates whitespace around the parameter separator', () => {
    expect(
      resolveDownloadContentType(
        headers({ 'content-type': ' application/pdf ; charset=utf-8' })
      )
    ).toBe('application/pdf')
  })

  it('matches the allow-list regardless of case', () => {
    expect(
      resolveDownloadContentType(headers({ 'content-type': 'IMAGE/JPEG' }))
    ).toBe('image/jpeg')
  })

  it.each([
    { name: 'a type outside the upload allow-list', value: 'text/html' },
    { name: 'an empty header', value: '' },
    { name: 'a malformed header', value: ';;;' }
  ])('serves $name as octet-stream', ({ value }) => {
    expect(resolveDownloadContentType(headers({ 'content-type': value }))).toBe(
      'application/octet-stream'
    )
  })

  it('serves octet-stream when no content type comes back at all', () => {
    expect(resolveDownloadContentType(headers({}))).toBe(
      'application/octet-stream'
    )
  })
})

describe('plant-products document download disposition', () => {
  it('passes the disposition the file was stored with straight through', () => {
    expect(
      resolveContentDisposition(
        headers({ 'content-disposition': 'inline; filename="phyto.pdf"' })
      )
    ).toBe('inline; filename="phyto.pdf"')
  })

  it('defaults to attachment when the backend sends none', () => {
    expect(resolveContentDisposition(headers({}))).toBe('attachment')
  })
})
