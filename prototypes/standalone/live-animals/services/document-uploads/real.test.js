import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { documentUploads } from './real.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const uploadDetails = {
  journeyId: 'GBN-1',
  filename: 'invoice.pdf',
  contentType: 'application/pdf',
  bytes: Buffer.from('pdf-bytes'),
  documentType: 'ITAHC',
  documentReference: 'GBHC1234567890',
  dateOfIssue: '2025-12-12',
  maxFileSize: 50000000,
  mimeTypes: ['application/pdf']
}

describe('document-uploads real adapter — backend HTTP boundary', () => {
  it('Should initiate against the notification then post the file to the returned uploadId', async () => {
    fetchMocker.mockResponses(JSON.stringify({ uploadId: 'up-1' }), [
      '',
      { status: 202 }
    ])

    const uploadId = await documentUploads.upload(uploadDetails)

    expect(uploadId).toBe('up-1')
    const [initiateUrl, initiateOptions] = fetchMocker.mock.calls[0]
    expect(initiateUrl).toBe(
      'http://localhost:8085/notifications/GBN-1/document-uploads'
    )
    expect(JSON.parse(initiateOptions.body)).toEqual({
      documentType: 'ITAHC',
      documentReference: 'GBHC1234567890',
      dateOfIssue: '2025-12-12',
      maxFileSize: 50000000,
      mimeTypes: ['application/pdf']
    })
    const [fileUrl, fileOptions] = fetchMocker.mock.calls[1]
    expect(fileUrl).toBe('http://localhost:8085/document-uploads/up-1/file')
    expect(fileOptions.body).toBeInstanceOf(FormData)
    const file = fileOptions.body.get('file')
    expect(file.name).toBe('invoice.pdf')
    expect(file.type).toBe('application/pdf')
  })

  it('Should throw with the response status when initiate fails, without posting the file', async () => {
    fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))

    await expect(documentUploads.upload(uploadDetails)).rejects.toMatchObject({
      status: 404
    })
    expect(fetchMocker.mock.calls).toHaveLength(1)
  })

  it('Should read scanStatus from the upload session', async () => {
    fetchMocker.mockResponse(JSON.stringify({ scanStatus: 'COMPLETE' }))

    expect(await documentUploads.scanStatus({ uploadId: 'up-1' })).toBe(
      'COMPLETE'
    )
    expect(fetchMocker.mock.calls[0][0]).toBe(
      'http://localhost:8085/document-uploads/up-1'
    )
  })

  it('Should DELETE the upload session on remove', async () => {
    fetchMocker.mockResponse('', { status: 200 })

    await documentUploads.remove('up-1')

    const [url, options] = fetchMocker.mock.calls[0]
    expect(url).toBe('http://localhost:8085/document-uploads/up-1')
    expect(options.method).toBe('DELETE')
  })

  it('Should throw with the response status when remove fails', async () => {
    fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))

    await expect(documentUploads.remove('up-2')).rejects.toMatchObject({
      status: 404
    })
  })
})
