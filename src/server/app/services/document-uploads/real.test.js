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
const SESSION_UPLOAD_ID = 'up-2'
const SESSION_CORRELATION_ID = 'corr-2'
const ID_WITH_SEPARATORS = '../../notifications/x'
const ID_WITH_SEPARATORS_ENCODED = '..%2F..%2Fnotifications%2Fx'
const JSON_CONTENT_TYPE = 'application/json'
const NOT_FOUND_RESPONSE = { status: 404, statusText: 'Not Found' }

const sentAs = ({ method, url, headers }) => ({
  method,
  url,
  contentType: headers.get('content-type')
})

const jsonOf = (request) => request.clone().json()

describe('#documentUploads', () => {
  describe('#register', () => {
    it('Should record the session against the notification by both of its ids', async () => {
      fetchMocker.mockResponse('', { status: 201 })

      await documentUploads.register({
        journeyId: JOURNEY_ID,
        uploadId: UPLOAD_ID,
        correlationId: CORRELATION_ID
      })

      const requests = fetchMocker.requests()
      expect(requests.map(sentAs)).toEqual([
        {
          method: 'POST',
          url: `${BACKEND_URL}/notifications/${JOURNEY_ID}/document-uploads`,
          contentType: JSON_CONTENT_TYPE
        }
      ])
      expect(await jsonOf(requests[0])).toEqual({
        uploadId: UPLOAD_ID,
        correlationId: CORRELATION_ID
      })
    })

    it('Should throw with the response status when the session cannot be recorded', async () => {
      fetchMocker.mockResponse(() => ({ status: 409, statusText: 'Conflict' }))

      await expect(
        documentUploads.register({
          journeyId: JOURNEY_ID,
          uploadId: UPLOAD_ID,
          correlationId: CORRELATION_ID
        })
      ).rejects.toMatchObject({
        message: 'Failed to register document upload: 409 Conflict',
        status: 409
      })
    })
  })

  describe('#claim', () => {
    it('Should post the document details to the upload it claims', async () => {
      fetchMocker.mockResponse(JSON.stringify({ claimed: true }))

      await documentUploads.claim({
        uploadId: UPLOAD_ID,
        documentType: 'ITAHC',
        documentReference: 'GBHC1234567890',
        dateOfIssue: '2025-12-12'
      })

      const requests = fetchMocker.requests()
      expect(requests.map(sentAs)).toEqual([
        {
          method: 'POST',
          url: `${BACKEND_URL}/document-uploads/${UPLOAD_ID}/claim`,
          contentType: JSON_CONTENT_TYPE
        }
      ])
      expect(await jsonOf(requests[0])).toEqual({
        documentType: 'ITAHC',
        documentReference: 'GBHC1234567890',
        dateOfIssue: '2025-12-12'
      })
    })

    it('Should throw with the response status when the upload cannot be claimed', async () => {
      fetchMocker.mockResponse(() => NOT_FOUND_RESPONSE)

      await expect(
        documentUploads.claim({ uploadId: UPLOAD_ID })
      ).rejects.toMatchObject({
        message: 'Failed to claim document upload: 404 Not Found',
        status: 404
      })
    })
  })

  describe('#findByCorrelationId', () => {
    it('Should answer the session the notification opened under that correlationId', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          notificationReferenceNumber: JOURNEY_ID,
          uploadId: SESSION_UPLOAD_ID,
          correlationId: SESSION_CORRELATION_ID
        })
      )

      await expect(
        documentUploads.findByCorrelationId({
          journeyId: JOURNEY_ID,
          correlationId: SESSION_CORRELATION_ID
        })
      ).resolves.toMatchObject({ uploadId: SESSION_UPLOAD_ID })
      expect(fetchMocker.mock.calls[0][0]).toBe(
        `${BACKEND_URL}/notifications/${JOURNEY_ID}/document-upload-sessions/${SESSION_CORRELATION_ID}`
      )
    })

    it('Should answer nothing when the notification has no session under that correlationId', async () => {
      fetchMocker.mockResponse(() => NOT_FOUND_RESPONSE)

      await expect(
        documentUploads.findByCorrelationId({
          journeyId: JOURNEY_ID,
          correlationId: CORRELATION_ID
        })
      ).resolves.toBeUndefined()
    })

    it('Should throw with the response status when the session cannot be read', async () => {
      fetchMocker.mockResponse(() => ({
        status: 503,
        statusText: 'Service Unavailable'
      }))

      await expect(
        documentUploads.findByCorrelationId({
          journeyId: JOURNEY_ID,
          correlationId: CORRELATION_ID
        })
      ).rejects.toMatchObject({
        message:
          'Failed to get document upload session: 503 Service Unavailable',
        status: 503
      })
    })
  })
})

describe('#documentUploads — scan status, removal and reads', () => {
  describe('#scanStatus', () => {
    it('Should answer the scan status read from the upload it names', async () => {
      fetchMocker.mockResponse(JSON.stringify({ scanStatus: 'COMPLETE' }))

      expect(await documentUploads.scanStatus({ uploadId: UPLOAD_ID })).toEqual(
        { scanStatus: 'COMPLETE' }
      )
      expect(fetchMocker.mock.calls[0][0]).toBe(
        `${BACKEND_URL}/document-uploads/${UPLOAD_ID}`
      )
    })

    it('Should answer the reason the refused file carries, so the page can name it', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          scanStatus: 'REJECTED',
          files: [
            {
              hasError: true,
              errorCode: 'FILE_VIRUS',
              errorMessage: 'The selected file contains a virus'
            }
          ]
        })
      )

      await expect(
        documentUploads.scanStatus({ uploadId: UPLOAD_ID })
      ).resolves.toEqual({
        scanStatus: 'REJECTED',
        rejectionReason: 'FILE_VIRUS'
      })
    })

    it('Should pass over files the scan took on to reach the one it refused', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          scanStatus: 'REJECTED',
          files: [
            { hasError: false, errorCode: null, errorMessage: null },
            {
              hasError: true,
              errorCode: 'FILE_DOWNLOAD_FAILED',
              errorMessage: 'The selected file could not be downloaded'
            }
          ]
        })
      )

      await expect(
        documentUploads.scanStatus({ uploadId: UPLOAD_ID })
      ).resolves.toEqual({
        scanStatus: 'REJECTED',
        rejectionReason: 'FILE_DOWNLOAD_FAILED'
      })
    })

    it('Should answer no reason for a refusal that carries no code', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          scanStatus: 'REJECTED',
          files: [{ hasError: true, errorMessage: 'Rejected' }]
        })
      )

      const read = await documentUploads.scanStatus({ uploadId: UPLOAD_ID })

      expect(read.scanStatus).toBe('REJECTED')
      expect(read.rejectionReason).toBeUndefined()
    })
  })

  describe('#remove', () => {
    it('Should DELETE the upload session on remove', async () => {
      fetchMocker.mockResponse('', { status: 200 })

      await documentUploads.remove(UPLOAD_ID)

      const [url, options] = fetchMocker.mock.calls[0]
      expect(url).toBe(`${BACKEND_URL}/document-uploads/${UPLOAD_ID}`)
      expect(options.method).toBe('DELETE')
    })

    it('Should throw with the response status when remove fails', async () => {
      fetchMocker.mockResponse(() => NOT_FOUND_RESPONSE)

      await expect(documentUploads.remove(UPLOAD_ID)).rejects.toMatchObject({
        message: 'Failed to delete document upload: 404 Not Found',
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
      expect(url).toBe(`${BACKEND_URL}/document-uploads/${UPLOAD_ID}/file`)
      expect(options.method).toBe('GET')
      expect(response.headers.get('content-type')).toBe(PDF_CONTENT_TYPE)
      expect(response.headers.get('content-disposition')).toBe(
        'inline; filename="itahc.pdf"'
      )
      expect(await response.text()).toBe('%PDF-1.4 stored bytes')
    })

    it('Should throw with the response status when the file is not there', async () => {
      fetchMocker.mockResponse(() => NOT_FOUND_RESPONSE)

      await expect(documentUploads.streamFile(UPLOAD_ID)).rejects.toMatchObject(
        {
          message: 'Failed to stream document file: 404 Not Found',
          status: 404
        }
      )
    })
  })
})

describe('#documentUploads — interpolated path segments', () => {
  it.each([
    [
      'the notification a session is recorded against',
      () =>
        documentUploads.register({
          journeyId: ID_WITH_SEPARATORS,
          uploadId: UPLOAD_ID,
          correlationId: CORRELATION_ID
        }),
      `${BACKEND_URL}/notifications/${ID_WITH_SEPARATORS_ENCODED}/document-uploads`
    ],
    [
      'the upload a claim names',
      () => documentUploads.claim({ uploadId: ID_WITH_SEPARATORS }),
      `${BACKEND_URL}/document-uploads/${ID_WITH_SEPARATORS_ENCODED}/claim`
    ],
    [
      'the notification a session is looked up on',
      () =>
        documentUploads.findByCorrelationId({
          journeyId: ID_WITH_SEPARATORS,
          correlationId: CORRELATION_ID
        }),
      `${BACKEND_URL}/notifications/${ID_WITH_SEPARATORS_ENCODED}/document-upload-sessions/${CORRELATION_ID}`
    ],
    [
      'the handle a session is looked up by',
      () =>
        documentUploads.findByCorrelationId({
          journeyId: JOURNEY_ID,
          correlationId: ID_WITH_SEPARATORS
        }),
      `${BACKEND_URL}/notifications/${JOURNEY_ID}/document-upload-sessions/${ID_WITH_SEPARATORS_ENCODED}`
    ],
    [
      'the upload a scan status is read from',
      () => documentUploads.scanStatus({ uploadId: ID_WITH_SEPARATORS }),
      `${BACKEND_URL}/document-uploads/${ID_WITH_SEPARATORS_ENCODED}`
    ],
    [
      'the upload a remove names',
      () => documentUploads.remove(ID_WITH_SEPARATORS),
      `${BACKEND_URL}/document-uploads/${ID_WITH_SEPARATORS_ENCODED}`
    ],
    [
      'the upload a file is streamed from',
      () => documentUploads.streamFile(ID_WITH_SEPARATORS),
      `${BACKEND_URL}/document-uploads/${ID_WITH_SEPARATORS_ENCODED}/file`
    ]
  ])(
    'Should keep a separator out of the URL path at %s',
    async (_segment, call, expectedUrl) => {
      fetchMocker.mockResponse(JSON.stringify({}))

      await call()

      expect(fetchMocker.mock.calls[0][0]).toBe(expectedUrl)
    }
  )
})
