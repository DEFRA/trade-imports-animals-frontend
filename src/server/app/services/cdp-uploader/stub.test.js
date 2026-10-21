import { describe, expect, it } from 'vitest'

import {
  STUB_UPLOAD_PATH,
  documentUploadSessions,
  stubUploadRoutes
} from './stub.js'

const RETURN_PATH = '/live-animals/notifications/j-1/accompanying-documents'

const openSession = () =>
  documentUploadSessions.open({
    correlationId: 'correlation-1',
    returnPath: RETURN_PATH
  })

const takeUploadHandler = () => {
  let route
  stubUploadRoutes.plugin.register({
    route: (registered) => {
      route = registered
    }
  })
  return route
}

const uploadRequest = (uploadId, file, fields = {}) => ({
  params: { uploadId },
  payload: {
    ...fields,
    ...(file ? { file } : {})
  }
})

const toolkit = () => {
  const captured = {}
  return {
    captured,
    redirect: (path) => {
      captured.redirect = path
      return captured
    },
    response: () => ({
      code: (statusCode) => {
        captured.statusCode = statusCode
        return captured
      }
    })
  }
}

const pdf = (filename, bytes = 8) => ({
  filename,
  headers: { 'content-type': 'application/pdf' },
  payload: Buffer.alloc(bytes, 1)
})

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
    it('Should answer an empty form until something is uploaded to the session', async () => {
      const { uploadId } = await openSession()

      await expect(documentUploadSessions.read(uploadId)).resolves.toEqual({
        uploadStatus: 'pending',
        form: {}
      })
    })

    it('Should throw a not-found for a session that was never opened', async () => {
      await expect(
        documentUploadSessions.read('never-opened')
      ).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('the upload stand-in route', () => {
    it('Should keep the text fields submitted alongside the file and return the browser', async () => {
      const { uploadId } = await openSession()
      const handler = takeUploadHandler().handler
      const h = toolkit()

      const response = handler(
        uploadRequest(uploadId, pdf('cert.pdf'), {
          accompanyingDocumentReference: 'GBHC1234567890',
          accompanyingDocumentType: 'ITAHC'
        }),
        h
      )

      expect(response.redirect).toBe(RETURN_PATH)
      const { form } = await documentUploadSessions.read(uploadId)
      expect(form.accompanyingDocumentReference).toBe('GBHC1234567890')
      expect(form.accompanyingDocumentType).toBe('ITAHC')
      expect(form.file.filename).toBe('cert.pdf')
      expect(form.file.hasError).toBe(false)
      expect(form.file.fileStatus).toBe('complete')
    })

    it('Should mark a file named as oversize rejected, with the too-large code', async () => {
      const { uploadId } = await openSession()
      const handler = takeUploadHandler().handler

      handler(uploadRequest(uploadId, pdf('oversize.pdf')), toolkit())

      const { form } = await documentUploadSessions.read(uploadId)
      expect(form.file.hasError).toBe(true)
      expect(form.file.errorCode).toBe('FILE_TOO_LARGE')
      expect(form.file.fileStatus).toBe('rejected')
    })

    it('Should refuse a file whose extension is not an accepted type', async () => {
      const { uploadId } = await openSession()
      const handler = takeUploadHandler().handler

      handler(uploadRequest(uploadId, pdf('notes.zip')), toolkit())

      const { form } = await documentUploadSessions.read(uploadId)
      expect(form.file.hasError).toBe(true)
      expect(form.file.errorCode).toBe('FILE_INVALID_TYPE')
    })

    it('Should answer a not-found for a session that was never opened', () => {
      const handler = takeUploadHandler().handler

      const response = handler(
        uploadRequest('never-opened', pdf('cert.pdf')),
        toolkit()
      )

      expect(response.statusCode).toBe(404)
    })
  })
})
