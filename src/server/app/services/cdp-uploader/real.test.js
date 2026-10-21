import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { documentUploadSessions } from './real.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const UPLOADER_URL = 'http://localhost:7337'
const UPLOAD_ID = 'upload-session-1'
const JOURNEY_ID = 'GBN-AG-26-000001'
const RETURN_PATH = `/live-animals/notifications/${JOURNEY_ID}/accompanying-documents?upload=correlation-1`

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
      expect(fetchMocker.mock.calls[0][0]).toBe(`${UPLOADER_URL}/initiate`)
    })

    /**
     * Outside development the upload service refuses an absolute redirect, so the whole value is
     * pinned: a `startsWith('/')` check would pass on a protocol-relative URL it also refuses.
     */
    it('Should ask the upload service to return the browser to a relative path', async () => {
      fetchMocker.mockResponse(JSON.stringify({ uploadId: UPLOAD_ID }))

      await openSession()

      const sent = JSON.parse(fetchMocker.mock.calls[0][1].body)
      expect(sent.redirect).toBe(RETURN_PATH)
    })

    it('Should name the callback the scan result is posted to, and the bucket the file lands in', async () => {
      fetchMocker.mockResponse(JSON.stringify({ uploadId: UPLOAD_ID }))

      await openSession()

      const sent = JSON.parse(fetchMocker.mock.calls[0][1].body)
      expect(sent.callback).toBe(
        'http://localhost:8085/document-uploads/pending/scan-results'
      )
      expect(sent.s3Bucket).toBe('trade-imports-animals-documents')
      expect(sent.s3Path).toBe(JOURNEY_ID)
    })

    it('Should hand over the limits it wants enforced and the handle the callback comes back with', async () => {
      fetchMocker.mockResponse(JSON.stringify({ uploadId: UPLOAD_ID }))

      await openSession()

      const sent = JSON.parse(fetchMocker.mock.calls[0][1].body)
      expect(sent.maxFileSize).toBe(50000000)
      expect(sent.mimeTypes).toEqual(['application/pdf'])
      expect(sent.metadata).toEqual({
        correlationId: 'correlation-1',
        notificationReferenceNumber: JOURNEY_ID
      })
    })

    it('Should throw with the response status when a session cannot be opened', async () => {
      fetchMocker.mockResponse(() => ({ status: 503, body: 'Unavailable' }))

      await expect(openSession()).rejects.toMatchObject({ status: 503 })
    })
  })

  describe('#read', () => {
    /**
     * The status URL the session reports is addressed to the browser, so reading it verbatim from
     * here resolves to this container's own loopback. The path is rebuilt on the configured base.
     */
    it('Should read the session at the configured host, not the one it reports', async () => {
      fetchMocker.mockResponse(
        JSON.stringify({ uploadStatus: 'pending', form: {} })
      )

      await documentUploadSessions.read(UPLOAD_ID)

      expect(fetchMocker.mock.calls[0][0]).toBe(
        `${UPLOADER_URL}/status/${UPLOAD_ID}`
      )
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

    it('Should throw with the response status when the session cannot be read', async () => {
      fetchMocker.mockResponse(() => ({ status: 404, body: 'Not Found' }))

      await expect(
        documentUploadSessions.read(UPLOAD_ID)
      ).rejects.toMatchObject({ status: 404 })
    })
  })
})
