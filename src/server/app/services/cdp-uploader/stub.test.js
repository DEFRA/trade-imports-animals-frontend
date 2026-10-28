import { describe, expect, it } from 'vitest'
import Hapi from '@hapi/hapi'

import {
  STUB_UPLOAD_PATH,
  documentUploadSessions,
  stubUploadRoutes
} from './stub.js'
import {
  UPLOAD_AWAITING_FILE,
  UPLOAD_READY,
  UPLOAD_SCANNING
} from './upload-statuses.js'
import {
  expectOneLogged,
  registerSharedTestRequestLogger
} from '../../engine/test-support.js'
import { ALLOWED_MIME_TYPES } from '../../sets/live-animals/journeys/linear/features/documents/upload-config.js'

const HTTP_STATUS_FOUND = 302
const HTTP_STATUS_NOT_FOUND = 404
const HTTP_STATUS_UNPROCESSABLE_CONTENT = 422
const PDF = 'application/pdf'
const ZIP = 'application/zip'
const CORRELATION_ID = 'correlation-1'
const JOURNEY_ID = 'GBN-AG-26-000001'
const RETURN_PATH = `/live-animals/notifications/${JOURNEY_ID}/accompanying-documents?upload=${CORRELATION_ID}`
const SESSION_CAP_BYTES = 1000
const BOUNDARY = 'stubuploadboundary'
const OVERSIZE_FILENAME = 'oversize.pdf'

const openSession = (maxFileSize = SESSION_CAP_BYTES) =>
  documentUploadSessions.open({
    journeyId: JOURNEY_ID,
    correlationId: CORRELATION_ID,
    returnPath: RETURN_PATH,
    maxFileSize,
    mimeTypes: ALLOWED_MIME_TYPES
  })

const buildServer = async () => {
  const server = Hapi.server()
  const logger = registerSharedTestRequestLogger(server)
  await server.register(stubUploadRoutes)
  return { server, logger }
}

const textFieldParts = (fields) =>
  Object.entries(fields)
    .map(
      ([name, value]) =>
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    )
    .join('')

const multipartBody = ({ filename, contentType, bytes, fields }) => {
  const text = textFieldParts(fields)
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

const postWithoutFile = (server, uploadPath, fields) =>
  server.inject({
    method: 'POST',
    url: uploadPath,
    payload: `${textFieldParts(fields)}--${BOUNDARY}--\r\n`,
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

    it('Should answer a session scanning once an accepted file has been uploaded to it', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: 'cert.pdf',
        contentType: PDF
      })

      const { uploadStatus } = await documentUploadSessions.read(uploadId)
      expect(uploadStatus).toBe(UPLOAD_SCANNING)
    })

    it('Should answer a session ready once a rejected file has been uploaded to it', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: OVERSIZE_FILENAME,
        contentType: PDF
      })

      const { uploadStatus } = await documentUploadSessions.read(uploadId)
      expect(uploadStatus).toBe(UPLOAD_READY)
    })

    it('Should answer a session ready once a submission carrying no file has been posted to it', async () => {
      const { server } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postWithoutFile(server, uploadPath, {
        accompanyingDocumentReference: 'GBHC1234567890'
      })

      const { uploadStatus } = await documentUploadSessions.read(uploadId)
      expect(uploadStatus).toBe(UPLOAD_READY)
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

      await postWithoutFile(server, uploadPath, {
        accompanyingDocumentReference: 'GBHC1234567890'
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

    it('Should reject a declared content type the session was not opened for', async () => {
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

    it('Should reject a declared type the session was not opened for, even when its extension looks harmless', async () => {
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
      const { server, logger } = await buildServer()
      const { uploadId, uploadPath } = await openSession()

      await postFile(server, uploadPath, {
        filename: OVERSIZE_FILENAME,
        contentType: PDF
      })

      expectOneLogged(logger, {
        level: 'info',
        fields: {
          uploadId,
          correlationId: CORRELATION_ID,
          errorCode: 'FILE_TOO_LARGE'
        },
        message: 'Upload refused by the stand-in upload service'
      })
    })

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

    it('Should answer a not-found saying the upload id does not exist, for a session that was never opened', async () => {
      const { server } = await buildServer()

      const response = await postFile(
        server,
        `${STUB_UPLOAD_PATH}/never-opened`,
        { filename: 'cert.pdf', contentType: PDF }
      )

      expect(response.statusCode).toBe(HTTP_STATUS_NOT_FOUND)
      expect(response.result.message).toBe(
        'Failed to upload - uploadId does not exist'
      )
    })

    it('Should refuse a second file to one session, naming the upload already used, and keep the file it already holds', async () => {
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
      expect(response.result.message).toBe(
        `uploadId ${uploadId} has already been used to upload files`
      )
      expect(await fileOf(uploadId)).toMatchObject({ filename: 'first.pdf' })
    })

    it('Should report a second file to one session in the log, naming the session and its status', async () => {
      const { server, logger } = await buildServer()
      const { uploadId, uploadPath } = await openSession()
      await postFile(server, uploadPath, {
        filename: 'first.pdf',
        contentType: PDF
      })

      await postFile(server, uploadPath, {
        filename: 'second.pdf',
        contentType: PDF
      })

      expectOneLogged(logger, {
        level: 'info',
        fields: {
          uploadId,
          correlationId: CORRELATION_ID,
          uploadStatus: UPLOAD_SCANNING
        },
        message: 'Upload posted to a session that has already taken a file'
      })
    })
  })
})
