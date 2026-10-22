import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { config } from '../../../../config/config.js'
import { documentUploadSessions } from './real.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

// Deliberately unlike the defaults, so a value read from somewhere other than
// the configuration — or hard-coded — fails rather than matching by accident.
const UPLOADER_URL = 'http://uploader.test:7337'
const CALLBACK_URL =
  'http://backend.test:8085/document-uploads/pending/scan-results'
const DOCUMENTS_BUCKET = 'configured-documents-bucket'
const TRACING_HEADER = 'x-cdp-request-id'
const UPLOAD_ID = 'upload-session-1'
const JOURNEY_ID = 'GBN-AG-26-000001'
const RETURN_PATH = `/live-animals/notifications/${JOURNEY_ID}/accompanying-documents?upload=correlation-1`

beforeEach(() => {
  config.set('cdpUploader.baseUrl', UPLOADER_URL)
  config.set('cdpUploader.scanResultCallbackUrl', CALLBACK_URL)
  config.set('cdpUploader.documentsBucket', DOCUMENTS_BUCKET)
})

const jsonOf = (request) => request.clone().json()

const openSession = () =>
  documentUploadSessions.open({
    journeyId: JOURNEY_ID,
    correlationId: 'correlation-1',
    returnPath: RETURN_PATH,
    maxFileSize: 50000000,
    mimeTypes: ['application/pdf']
  })

describe('#documentUploadSessions', () => {
  describe('#open', () => {
    it('Should answer the session id and the path the browser posts its file to', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          uploadId: UPLOAD_ID,
          statusUrl: `${UPLOADER_URL}/status/${UPLOAD_ID}`
        })
      )

      await expect(openSession()).resolves.toEqual({
        uploadId: UPLOAD_ID,
        uploadPath: `/upload-and-scan/${UPLOAD_ID}`
      })
      const [request] = fetchMocker.requests()
      expect({ method: request.method, url: request.url }).toEqual({
        method: 'POST',
        url: `${UPLOADER_URL}/initiate`
      })
    })

    /**
     * The upload service refuses the body without the JSON content type, and support follows a
     * 50MB upload across services by the tracing header, so both are part of the contract.
     */
    it('Should send both requests as JSON with the tracing header', async () => {
      fetchMocker.mockResponse(JSON.stringify({ uploadId: UPLOAD_ID }))

      await openSession()
      await documentUploadSessions.read(UPLOAD_ID)

      const [open, read] = fetchMocker.requests()
      expect(open.headers.get('content-type')).toBe('application/json')
      expect(open.headers.has(TRACING_HEADER)).toBe(true)
      expect(read.method).toBe('GET')
      expect(read.headers.has(TRACING_HEADER)).toBe(true)
    })

    // The whole value is pinned, not just its first character: a protocol-relative
    // URL starts with a slash and is refused too.
    it('Should ask the upload service to return the browser to a relative path', async () => {
      fetchMocker.mockResponse(JSON.stringify({ uploadId: UPLOAD_ID }))

      await openSession()

      const sent = await jsonOf(fetchMocker.requests()[0])
      expect(sent.redirect).toBe(RETURN_PATH)
    })

    /**
     * cdp-uploader resolves the callback itself, from inside the platform's network, so a value
     * that is not the configured one scans the file and posts the result nowhere.
     */
    it('Should take the callback and the bucket from the configuration', async () => {
      fetchMocker.mockResponse(JSON.stringify({ uploadId: UPLOAD_ID }))

      await openSession()

      const sent = await jsonOf(fetchMocker.requests()[0])
      expect(sent.callback).toBe(CALLBACK_URL)
      expect(sent.s3Bucket).toBe(DOCUMENTS_BUCKET)
      expect(sent.s3Path).toBe(JOURNEY_ID)
    })

    it('Should hand over the limits it wants enforced and the handle the callback comes back with', async () => {
      fetchMocker.mockResponse(JSON.stringify({ uploadId: UPLOAD_ID }))

      await openSession()

      const sent = await jsonOf(fetchMocker.requests()[0])
      expect(sent.maxFileSize).toBe(50000000)
      expect(sent.mimeTypes).toEqual(['application/pdf'])
      expect(sent.metadata).toEqual({
        correlationId: 'correlation-1',
        notificationReferenceNumber: JOURNEY_ID
      })
    })

    it('Should throw naming the action and the status when a session cannot be opened', async () => {
      fetchMocker.mockResponse(() => ({ status: 503, body: 'Unavailable' }))

      await expect(openSession()).rejects.toMatchObject({
        status: 503,
        message: expect.stringContaining('open an upload session')
      })
    })
  })

  describe('#read', () => {
    it('Should read the session at the configured host', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({ uploadStatus: 'pending', form: {} })
      )

      await documentUploadSessions.read(UPLOAD_ID)

      const [request] = fetchMocker.requests()
      expect(request.url).toBe(`${UPLOADER_URL}/status/${UPLOAD_ID}`)
    })

    it('Should answer the submitted form alongside the session state', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({
          uploadStatus: 'pending',
          form: {
            accompanyingDocumentReference: 'GBHC1234567890',
            file: { filename: 'cert.pdf', hasError: false }
          }
        })
      )

      await expect(documentUploadSessions.read(UPLOAD_ID)).resolves.toEqual({
        uploadStatus: 'pending',
        form: {
          accompanyingDocumentReference: 'GBHC1234567890',
          file: { filename: 'cert.pdf', hasError: false }
        }
      })
    })

    it('Should throw naming the action and the status when the session cannot be read', async () => {
      fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))

      await expect(
        documentUploadSessions.read(UPLOAD_ID)
      ).rejects.toMatchObject({
        status: 404,
        message: expect.stringContaining('read an upload session')
      })
    })
  })
})
