import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { documentUploads } from './real.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const BACKEND_URL = 'http://localhost:8085'
const PDF_CONTENT_TYPE = 'application/pdf'

const uploadDetails = {
  journeyId: 'GBN-1',
  filename: 'invoice.pdf',
  contentType: PDF_CONTENT_TYPE,
  bytes: Buffer.from('pdf-bytes'),
  documentType: 'ITAHC',
  documentReference: 'GBHC1234567890',
  dateOfIssue: '2025-12-12',
  maxFileSize: 10000000,
  mimeTypes: [PDF_CONTENT_TYPE]
}

describe('#documentUploads', () => {
  describe('#upload', () => {
    it('Should initiate against the notification then post the file to the returned uploadId', async () => {
      fetchMocker.mockResponses(JSON.stringify({ uploadId: 'up-1' }), [
        '',
        { status: 202 }
      ])

      const uploadId = await documentUploads.upload(uploadDetails)

      expect(uploadId).toBe('up-1')
      const [initiateUrl, initiateOptions] = fetchMocker.mock.calls[0]
      expect(initiateUrl).toBe(
        `${BACKEND_URL}/notifications/GBN-1/document-uploads`
      )
      expect(JSON.parse(initiateOptions.body)).toEqual({
        documentType: 'ITAHC',
        documentReference: 'GBHC1234567890',
        dateOfIssue: '2025-12-12',
        maxFileSize: 10000000,
        mimeTypes: [PDF_CONTENT_TYPE]
      })
      const [fileUrl, fileOptions] = fetchMocker.mock.calls[1]
      expect(fileUrl).toBe(`${BACKEND_URL}/document-uploads/up-1/file`)
      expect(fileOptions.body).toBeInstanceOf(FormData)
      const file = fileOptions.body.get('file')
      expect(file.name).toBe('invoice.pdf')
      expect(file.type).toBe(PDF_CONTENT_TYPE)
    })

    it('Should throw with the response status when initiate fails, without posting the file', async () => {
      fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))

      await expect(documentUploads.upload(uploadDetails)).rejects.toMatchObject(
        {
          status: 404
        }
      )
      expect(fetchMocker.mock.calls).toHaveLength(1)
    })

    it('Should issue no compensating delete when the whole upload succeeds', async () => {
      fetchMocker.mockResponses(JSON.stringify({ uploadId: 'up-1' }), [
        '',
        { status: 202 }
      ])

      await documentUploads.upload(uploadDetails)

      expect(fetchMocker.mock.calls).toHaveLength(2)
      expect(
        fetchMocker.mock.calls.some(
          ([, options]) => options.method === 'DELETE'
        )
      ).toBe(false)
    })

    it('Should delete the initiated session and rethrow the original error when the file leg fails', async () => {
      fetchMocker.mockResponses(
        JSON.stringify({ uploadId: 'up-1' }),
        ['Gateway Timeout', { status: 504 }],
        ['', { status: 204 }]
      )

      await expect(documentUploads.upload(uploadDetails)).rejects.toMatchObject(
        {
          status: 504
        }
      )

      const [deleteUrl, deleteOptions] = fetchMocker.mock.calls[2]
      expect(deleteUrl).toBe(`${BACKEND_URL}/document-uploads/up-1`)
      expect(deleteOptions.method).toBe('DELETE')
    })

    it('Should still surface the original failure when the compensating delete also fails', async () => {
      fetchMocker.mockResponses(
        JSON.stringify({ uploadId: 'up-1' }),
        ['Gateway Timeout', { status: 504 }],
        ['Server Error', { status: 500 }]
      )

      await expect(documentUploads.upload(uploadDetails)).rejects.toMatchObject(
        {
          status: 504
        }
      )
      expect(fetchMocker.mock.calls).toHaveLength(3)
    })
  })

  describe('#ownerOf', () => {
    it('Should read the owning notification reference from the upload session', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          scanStatus: 'PENDING',
          notificationReferenceNumber: 'GBN-PP-26-0001'
        })
      )

      expect(await documentUploads.ownerOf('up-1')).toBe('GBN-PP-26-0001')
      const [url, options] = fetchMocker.mock.calls[0]
      expect(url).toBe(`${BACKEND_URL}/document-uploads/up-1`)
      expect(options.method).toBe('GET')
    })

    it('Should throw with the response status when the session is unknown', async () => {
      fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))

      await expect(documentUploads.ownerOf('up-2')).rejects.toMatchObject({
        status: 404
      })
    })
  })

  describe('#scanStatus', () => {
    it('Should read scanStatus from the upload session', async () => {
      fetchMocker.mockResponse(JSON.stringify({ scanStatus: 'COMPLETE' }))

      expect(await documentUploads.scanStatus({ uploadId: 'up-1' })).toBe(
        'COMPLETE'
      )
      const [url, options] = fetchMocker.mock.calls[0]
      expect(url).toBe(`${BACKEND_URL}/document-uploads/up-1`)
      expect(options.method).toBe('GET')
    })
  })

  describe('#remove', () => {
    it('Should DELETE the upload session on remove', async () => {
      fetchMocker.mockResponse('', { status: 200 })

      await documentUploads.remove('up-1')

      const [url, options] = fetchMocker.mock.calls[0]
      expect(url).toBe(`${BACKEND_URL}/document-uploads/up-1`)
      expect(options.method).toBe('DELETE')
    })

    it('Should resolve when the session is already gone so a re-issued remove is idempotent', async () => {
      fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))

      await expect(documentUploads.remove('up-2')).resolves.toBeUndefined()
    })

    it('Should throw with the response status when remove fails', async () => {
      fetchMocker.mockResponse(() => ({ status: 500, body: 'Server Error' }))

      await expect(documentUploads.remove('up-2')).rejects.toMatchObject({
        status: 500
      })
    })
  })

  describe('#streamFile', () => {
    it('Should GET the file leg and hand back the streamed body and headers', async () => {
      fetchMocker.mockResponse('%PDF-1.4 stored bytes', {
        headers: {
          'content-type': PDF_CONTENT_TYPE,
          'content-disposition': 'inline; filename="itahc.pdf"'
        }
      })

      const response = await documentUploads.streamFile('up-1')

      const [url, options] = fetchMocker.mock.calls[0]
      expect(url).toBe(`${BACKEND_URL}/document-uploads/up-1/file`)
      expect(options.method).toBe('GET')
      expect(response.headers.get('content-type')).toBe(PDF_CONTENT_TYPE)
      expect(response.headers.get('content-disposition')).toBe(
        'inline; filename="itahc.pdf"'
      )
      expect(await response.text()).toBe('%PDF-1.4 stored bytes')
    })

    it('Should throw with the response status when the file is not there', async () => {
      fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))

      await expect(documentUploads.streamFile('up-2')).rejects.toMatchObject({
        status: 404
      })
    })
  })
})
