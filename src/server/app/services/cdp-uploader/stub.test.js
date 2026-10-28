import { describe, expect, it } from 'vitest'
import Hapi from '@hapi/hapi'

import {
  STUB_UPLOAD_PATH,
  documentUploadSessions,
  stubUploadRoutes
} from './stub.js'
import {
  UPLOAD_AWAITING_FILE,
  UPLOAD_SCANNING,
  awaitsItsFile
} from './upload-statuses.js'
import { ALLOWED_MIME_TYPES } from '../../sets/live-animals/journeys/linear/features/documents/upload-config.js'

const HTTP_STATUS_FOUND = 302
const HTTP_STATUS_NOT_FOUND = 404
const HTTP_STATUS_UNPROCESSABLE_CONTENT = 422
const PDF = 'application/pdf'
const ZIP = 'application/zip'
const CORRELATION_ID = 'correlation-1'
const JOURNEY_ID = 'GBN-AG-26-000001'
const RETURN_PATH = `/live-animals/notifications/${JOURNEY_ID}/accompanying-documents?upload=${CORRELATION_ID}`
// A cap the test can exceed in a few bytes, rather than the real one in megabytes.
const SESSION_CAP_BYTES = 1000
const BOUNDARY = 'stubuploadboundary'
const OVERSIZE_FILENAME = 'oversize.pdf'

// The five fields and the handle-carrying return path that the one production
// caller, handlers/add-form-session.js, hands the real adapter.
const openSession = (maxFileSize = SESSION_CAP_BYTES) =>
  documentUploadSessions.open({
    journeyId: JOURNEY_ID,
    correlationId: CORRELATION_ID,
    returnPath: RETURN_PATH,
    maxFileSize,
    mimeTypes: ALLOWED_MIME_TYPES
  })

// The real server has request.logger from hapi-pino. Recording it here keeps the
// same contract and lets a test read what the route reported.
const buildServer = async () => {
  const server = Hapi.server()
  const logged = []
  server.decorate('request', 'logger', {
    info: (data, message) => logged.push({ data, message }),
    error: (data, message) => logged.push({ data, message })
  })
  await server.register(stubUploadRoutes)
  return { server, logged }
}

/**
 * A real multipart body, so the route's own `output: 'annotated'` parsing is what produces the
 * filename, content type and length the stub reads — rather than a test inventing that shape.
 */
const multipartBody = ({ filename, contentType, bytes, fields }) => {
  const text = Object.entries(fields)
    .map(
      ([name, value]) =>
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    )
    .join('')
  const fileHead =
    `--${BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  return Buffer.concat([
    Buffer.from(text),
    Buffer.from(fileHead),
    Buffer.alloc(bytes, 1),
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
  ])
}

const postFile = (
  server,
  uploadPath,
  { filename, contentType, bytes = 8, fields = {} }
) =>
  server.inject({
    method: 'POST',
    url: uploadPath,
    payload: multipartBody({ filename, contentType, bytes, fields }),
    headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` }
  })

const fileOf = async (uploadId) => {
  const { form } = await documentUploadSessions.read(uploadId)
  return form.file
}

describe('#documentUploadSessions (stub)', () => {
  describe('#open', () => {
    it('Should answer a distinct session each time, posting to the stand-in path', async () => {
      const first = await openSession()
      const second = await openSession()

      expect(first.uploadId).not.toBe(second.uploadId)
      expect(first.uploadPath).toBe(`${STUB_UPLOAD_PATH}/${first.uploadId}`)
    })
  })

  describe('#read', () => {
    it('Should answer an empty form and a session awaiting its file until something is uploaded', async () => {
      const { uploadId } = await openSession()

      await expect(documentUploadSessions.read(uploadId)).resolves.toEqual({
        uploadStatus: UPLOAD_AWAITING_FILE,
        form: {}
      })
    })

    it('Should answer a session no longer awaiting its file once one has been uploaded to it', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: 'cert.pdf',
        contentType: PDF
      })

      const { uploadStatus } = await documentUploadSessions.read(uploadId)
      expect(awaitsItsFile(uploadStatus)).toBe(false)
    })

    it('Should throw a not-found for a session that was never opened', async () => {
      await expect(
        documentUploadSessions.read('never-opened')
      ).rejects.toMatchObject({ status: HTTP_STATUS_NOT_FOUND })
    })
  })
})

describe('#stubUploadRoutes', () => {
  describe('the upload stand-in route', () => {
    it('Should keep the text fields submitted alongside the file and return the browser', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      const response = await postFile(server, uploadPath, {
        filename: 'cert.pdf',
        contentType: PDF,
        fields: {
          accompanyingDocumentReference: 'GBHC1234567890',
          accompanyingDocumentType: 'ITAHC'
        }
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe(RETURN_PATH)
      const { form } = await documentUploadSessions.read(uploadId)
      expect(form.accompanyingDocumentReference).toBe('GBHC1234567890')
      expect(form.accompanyingDocumentType).toBe('ITAHC')
      expect(form.file).toMatchObject({
        filename: 'cert.pdf',
        contentType: PDF,
        hasError: false,
        fileStatus: 'complete'
      })
    })

    /**
     * The browser's own check refuses an oversize file before it is ever posted, so a test that
     * wants the service's refusal instead asks for it by name. It is the only name the stub reads.
     */
    it('Should mark a file named as oversize rejected, with the too-large code', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: OVERSIZE_FILENAME,
        contentType: PDF
      })

      expect(await fileOf(uploadId)).toMatchObject({
        hasError: true,
        errorCode: 'FILE_TOO_LARGE',
        fileStatus: 'rejected'
      })
    })

    it('Should reject a file with no bytes in it, with the empty code', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: 'cert.pdf',
        contentType: PDF,
        bytes: 0
      })

      expect(await fileOf(uploadId)).toMatchObject({
        hasError: true,
        errorCode: 'FILE_EMPTY',
        fileStatus: 'rejected'
      })
    })

    it('Should carry back no file entry at all when the submission had no file', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await server.inject({
        method: 'POST',
        url: uploadPath,
        payload: `--${BOUNDARY}\r\nContent-Disposition: form-data; name="accompanyingDocumentReference"\r\n\r\nGBHC1234567890\r\n--${BOUNDARY}--\r\n`,
        headers: {
          'content-type': `multipart/form-data; boundary=${BOUNDARY}`
        }
      })

      const { form } = await documentUploadSessions.read(uploadId)
      expect(form.accompanyingDocumentReference).toBe('GBHC1234567890')
      expect(form).not.toHaveProperty('file')
    })

    it('Should reject a file over the cap its session was opened with', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: 'cert.pdf',
        contentType: PDF,
        bytes: SESSION_CAP_BYTES + 1
      })

      expect(await fileOf(uploadId)).toMatchObject({
        hasError: true,
        errorCode: 'FILE_TOO_LARGE'
      })
    })

    /**
     * Judged on the declared content type against the session's own list, the way cdp-uploader
     * judges it. An extension rule here would take a file cdp-uploader refuses, and refuse one it
     * takes — which is what a stub must never do.
     */
    it('Should reject a content type the session was not opened for', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: 'notes.zip',
        contentType: ZIP
      })

      expect(await fileOf(uploadId)).toMatchObject({
        hasError: true,
        errorCode: 'FILE_INVALID_TYPE'
      })
    })

    /**
     * The case an extension rule gets wrong in the direction that matters: a GIF is on no
     * plausible deny-list, so a stub judging names takes it, while cdp-uploader refuses it for
     * not being on the session's list. The trader would then meet a refusal no stub run had shown.
     */
    it('Should reject a type that is off the list even when its extension looks harmless', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: 'scan.gif',
        contentType: 'image/gif'
      })

      expect(await fileOf(uploadId)).toMatchObject({
        hasError: true,
        errorCode: 'FILE_INVALID_TYPE'
      })
    })

    it('Should take a file whose declared type is on the list whatever its name suggests', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: 'certificate-without-an-extension',
        contentType: PDF
      })

      expect(await fileOf(uploadId)).toMatchObject({ hasError: false })
    })

    it('Should report a refusal in the log, naming the upload and the reason', async () => {
      const { server, logged } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: OVERSIZE_FILENAME,
        contentType: PDF
      })

      expect(logged).toEqual([
        {
          data: {
            uploadId,
            correlationId: CORRELATION_ID,
            errorCode: 'FILE_TOO_LARGE'
          },
          message: 'Upload refused by the stand-in upload service'
        }
      ])
    })

    // A refusal is a rejected file entry and a returned browser, not a failed request — which is
    // what makes the page's own error reachable.
    it('Should return the browser even when the file is refused', async () => {
      const { server } = await buildServer()
      const { uploadPath } = await openSession()

      const response = await postFile(server, uploadPath, {
        filename: OVERSIZE_FILENAME,
        contentType: PDF
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe(RETURN_PATH)
    })

    it('Should answer a not-found for a session that was never opened', async () => {
      const { server } = await buildServer()

      const response = await postFile(
        server,
        `${STUB_UPLOAD_PATH}/never-opened`,
        { filename: 'cert.pdf', contentType: PDF }
      )

      expect(response.statusCode).toBe(HTTP_STATUS_NOT_FOUND)
    })

    it('Should refuse a second file to one session, keeping the file it already holds', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()
      await postFile(server, uploadPath, {
        filename: 'first.pdf',
        contentType: PDF
      })

      const response = await postFile(server, uploadPath, {
        filename: 'second.pdf',
        contentType: PDF
      })

      expect(response.statusCode).toBe(HTTP_STATUS_UNPROCESSABLE_CONTENT)
      expect(await fileOf(uploadId)).toMatchObject({ filename: 'first.pdf' })
    })

    it('Should report a second file to one session in the log, naming the session and its status', async () => {
      const { server, logged } = await buildServer()
      const { uploadId, uploadPath } = await openSession()
      await postFile(server, uploadPath, {
        filename: 'first.pdf',
        contentType: PDF
      })

      await postFile(server, uploadPath, {
        filename: 'second.pdf',
        contentType: PDF
      })

      expect(logged).toEqual([
        {
          data: {
            uploadId,
            correlationId: CORRELATION_ID,
            uploadStatus: UPLOAD_SCANNING
          },
          message: 'Upload posted to a session that has already taken a file'
        }
      ])
    })
  })
})
