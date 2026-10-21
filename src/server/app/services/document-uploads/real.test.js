import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { documentUploads } from './real.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const BACKEND_URL = 'http://localhost:8085'
const PDF_CONTENT_TYPE = 'application/pdf'
const UPLOAD_ID = 'up-1'
const CORRELATION_ID = 'corr-1'
const JOURNEY_ID = 'GBN-1'
const SCAN_COMPLETE = 'COMPLETE'
const OTHER_UPLOAD_ID = 'up-2'
const OTHER_CORRELATION_ID = 'corr-2'
const NOT_FOUND_BODY = 'Not Found'

describe('#documentUploads', () => {
  describe('#register', () => {
    it('Should record the session against the notification by both of its ids', async () => {
      fetchMocker.mockResponse('', { status: 201 })

      await documentUploads.register({
        journeyId: JOURNEY_ID,
        uploadId: UPLOAD_ID,
        correlationId: CORRELATION_ID
      })

      const [url, options] = fetchMocker.mock.calls[0]
      expect(url).toBe(`${BACKEND_URL}/notifications/GBN-1/document-uploads`)
      expect(JSON.parse(options.body)).toEqual({
        uploadId: UPLOAD_ID,
        correlationId: CORRELATION_ID
      })
    })

    it('Should throw with the response status when the session cannot be recorded', async () => {
      fetchMocker.mockResponse(() => ({ status: 409, body: 'Conflict' }))

      await expect(
        documentUploads.register({
          journeyId: JOURNEY_ID,
          uploadId: UPLOAD_ID,
          correlationId: CORRELATION_ID
        })
      ).rejects.toMatchObject({ status: 409 })
    })
  })

  describe('#claim', () => {
    it('Should send the validated details to the upload it claims', async () => {
      fetchMocker.mockResponse(JSON.stringify({ claimed: true }))

      await documentUploads.claim({
        uploadId: UPLOAD_ID,
        documentType: 'ITAHC',
        documentReference: 'GBHC1234567890',
        dateOfIssue: '2025-12-12'
      })

      const [url, options] = fetchMocker.mock.calls[0]
      expect(url).toBe(`${BACKEND_URL}/document-uploads/up-1/claim`)
      expect(JSON.parse(options.body)).toEqual({
        documentType: 'ITAHC',
        documentReference: 'GBHC1234567890',
        dateOfIssue: '2025-12-12'
      })
    })

    it('Should throw with the response status when the upload cannot be claimed', async () => {
      fetchMocker.mockResponse(() => ({ status: 404, body: NOT_FOUND_BODY }))

      await expect(
        documentUploads.claim({ uploadId: UPLOAD_ID })
      ).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('#findByCorrelationId', () => {
    it('Should pick the notification document carrying that correlationId', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          items: [
            { uploadId: UPLOAD_ID, correlationId: CORRELATION_ID },
            { uploadId: OTHER_UPLOAD_ID, correlationId: OTHER_CORRELATION_ID }
          ]
        })
      )

      await expect(
        documentUploads.findByCorrelationId({
          journeyId: JOURNEY_ID,
          correlationId: OTHER_CORRELATION_ID
        })
      ).resolves.toEqual({
        uploadId: OTHER_UPLOAD_ID,
        correlationId: OTHER_CORRELATION_ID
      })
    })

    it('Should answer nothing when no document carries that correlationId', async () => {
      fetchMocker.mockResponse(JSON.stringify({ items: [] }))

      await expect(
        documentUploads.findByCorrelationId({
          journeyId: JOURNEY_ID,
          correlationId: CORRELATION_ID
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('#scanStatus', () => {
    it('Should read scanStatus from the upload session', async () => {
      fetchMocker.mockResponse(JSON.stringify({ scanStatus: SCAN_COMPLETE }))

      expect(await documentUploads.scanStatus({ uploadId: UPLOAD_ID })).toEqual(
        {
          scanStatus: SCAN_COMPLETE,
          rejectionReason: null
        }
      )
      expect(fetchMocker.mock.calls[0][0]).toBe(
        `${BACKEND_URL}/document-uploads/up-1`
      )
    })

    it('Should report why a rejected upload was rejected', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          scanStatus: 'REJECTED',
          files: [
            { hasError: false, errorMessage: null },
            {
              hasError: true,
              errorMessage: 'The selected file contains a virus'
            }
          ]
        })
      )

      await expect(
        documentUploads.scanStatus({ uploadId: UPLOAD_ID })
      ).resolves.toEqual({
        scanStatus: 'REJECTED',
        rejectionReason: 'The selected file contains a virus'
      })
    })
  })

  describe('#remove', () => {
    it('Should DELETE the upload session on remove', async () => {
      fetchMocker.mockResponse('', { status: 200 })

      await documentUploads.remove(UPLOAD_ID)

      const [url, options] = fetchMocker.mock.calls[0]
      expect(url).toBe(`${BACKEND_URL}/document-uploads/up-1`)
      expect(options.method).toBe('DELETE')
    })

    it('Should throw with the response status when remove fails', async () => {
      fetchMocker.mockResponse(() => ({ status: 404, body: NOT_FOUND_BODY }))

      await expect(
        documentUploads.remove(OTHER_UPLOAD_ID)
      ).rejects.toMatchObject({
        status: 404
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

      const response = await documentUploads.streamFile(UPLOAD_ID)

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
      fetchMocker.mockResponse(() => ({ status: 404, body: NOT_FOUND_BODY }))

      await expect(
        documentUploads.streamFile(OTHER_UPLOAD_ID)
      ).rejects.toMatchObject({
        status: 404
      })
    })
  })
})
