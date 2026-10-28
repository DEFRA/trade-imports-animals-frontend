import { randomUUID } from 'node:crypto'

import {
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_UNPROCESSABLE_CONTENT
} from '../../lib/http-status.js'
import {
  FILE_EMPTY,
  FILE_INVALID_TYPE,
  FILE_TOO_LARGE
} from './file-error-codes.js'
import {
  UPLOAD_AWAITING_FILE,
  UPLOAD_READY,
  UPLOAD_SCANNING,
  awaitsItsFile
} from './upload-statuses.js'

// A rule a stub run cannot reach honestly, so a test asks for it by name: the
// browser's own check refuses an oversize file before it is ever posted, and a
// test that wants the service's refusal instead has no way to provoke it.
const OVERSIZE_FILENAME = /oversize|too-?big/i

// The transport ceiling for the stand-in route, not the file cap. cdp-uploader
// answers an oversize file with a rejected file entry, not by refusing the
// request, so the body has to reach the handler for the stub to answer the same
// way. Without a cap here hapi's 1 MB default stands and every document a
// trader attaches is refused with a 413 before the handler runs. The file cap
// is whatever the session was opened with, enforced in fileErrorCodeFor.
const ROUTE_BODY_CEILING_MB = 64
const BYTES_PER_MEGABYTE = 1_000_000
const ROUTE_BODY_CEILING_BYTES = ROUTE_BODY_CEILING_MB * BYTES_PER_MEGABYTE

export const STUB_UPLOAD_PATH = '/stub-upload-and-scan'

const sessions = new Map()

const fileErrorCodeFor = ({
  filename,
  contentType,
  contentLength,
  maxFileSize,
  mimeTypes
}) => {
  // Judged on the type the browser declared and the limits the session was
  // opened with, as cdp-uploader judges it — not on the extension. A stub
  // that applied rules of its own would take a file cdp-uploader refuses.
  if (contentLength === 0) {
    return FILE_EMPTY
  }
  if (Array.isArray(mimeTypes) && !mimeTypes.includes(contentType)) {
    return FILE_INVALID_TYPE
  }
  if (OVERSIZE_FILENAME.test(filename)) {
    return FILE_TOO_LARGE
  }
  const overCap =
    Number.isFinite(maxFileSize) &&
    Number.isFinite(contentLength) &&
    contentLength > maxFileSize
  return overCap ? FILE_TOO_LARGE : undefined
}

const fileEntryFor = (upload) => {
  const errorCode = fileErrorCodeFor(upload)
  return {
    fileId: randomUUID(),
    filename: upload.filename,
    contentType: upload.contentType,
    contentLength: upload.contentLength,
    fileStatus: errorCode ? 'rejected' : 'complete',
    hasError: Boolean(errorCode),
    errorCode: errorCode ?? null,
    errorMessage: errorCode ? 'The selected file was rejected' : null
  }
}

export const documentUploadSessions = {
  uploadPathFor: (uploadId) => `${STUB_UPLOAD_PATH}/${uploadId}`,

  open: async ({ correlationId, returnPath, maxFileSize, mimeTypes }) => {
    const uploadId = randomUUID()
    sessions.set(uploadId, {
      correlationId,
      returnPath,
      maxFileSize,
      mimeTypes,
      uploadStatus: UPLOAD_AWAITING_FILE,
      form: {}
    })
    return {
      uploadId,
      uploadPath: documentUploadSessions.uploadPathFor(uploadId)
    }
  },

  read: async (uploadId) => {
    const session = sessions.get(uploadId)
    if (!session) {
      const error = new Error(`Failed to read an upload session: ${uploadId}`)
      error.status = HTTP_STATUS_NOT_FOUND
      throw error
    }
    return { uploadStatus: session.uploadStatus, form: session.form }
  }
}

const textFieldsOf = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value === 'string')
  )

// A submission with no file part carries no file entry back, as cdp-uploader
// answers it. Synthesising one here left the page's own "upload a document"
// refusal exercised by nothing.
const formFromSubmission = (session, payload) => {
  const file = payload.file
  const textFields = textFieldsOf(payload)
  if (!file?.filename) {
    return textFields
  }
  return {
    ...textFields,
    file: fileEntryFor({
      filename: file.filename,
      contentType: file.headers?.['content-type'],
      contentLength: file.payload?.length ?? 0,
      maxFileSize: session.maxFileSize,
      mimeTypes: session.mimeTypes
    })
  }
}

const uploadStatusFor = (form) =>
  form.file && !form.file.hasError ? UPLOAD_SCANNING : UPLOAD_READY

/**
 * Records against an opened session what the add-a-document form submitted to it, judging the
 * file by the limits the session was opened with.
 *
 * @param {string} uploadId - the session the form posted to
 * @param {object} payload - the submitted fields, `file` as hapi's annotated multipart entry
 * @returns {object|undefined} the form `read` will answer with, or nothing for a session that was
 *   never opened
 */
export const recordSubmittedUpload = (uploadId, payload) => {
  const session = sessions.get(uploadId)
  if (!session) {
    return undefined
  }
  session.form = formFromSubmission(session, payload)
  session.uploadStatus = uploadStatusFor(session.form)
  return session.form
}

const takeUpload = (request, h) => {
  const session = sessions.get(request.params.uploadId)
  if (!session) {
    request.logger.info(
      { uploadId: request.params.uploadId },
      'Upload posted to a session that was never opened'
    )
    return h
      .response({ message: 'Failed to upload - uploadId does not exist' })
      .code(HTTP_STATUS_NOT_FOUND)
  }
  if (!awaitsItsFile(session.uploadStatus)) {
    request.logger.info(
      {
        uploadId: request.params.uploadId,
        correlationId: session.correlationId,
        uploadStatus: session.uploadStatus
      },
      'Upload posted to a session that has already taken a file'
    )
    return h
      .response({
        message: `uploadId ${request.params.uploadId} has already been used to upload files`
      })
      .code(HTTP_STATUS_UNPROCESSABLE_CONTENT)
  }
  recordSubmittedUpload(request.params.uploadId, request.payload ?? {})
  if (session.form.file?.hasError) {
    request.logger.info(
      {
        uploadId: request.params.uploadId,
        correlationId: session.correlationId,
        errorCode: session.form.file.errorCode
      },
      'Upload refused by the stand-in upload service'
    )
  }
  return h.redirect(session.returnPath)
}

export const stubUploadRoutes = {
  plugin: {
    name: 'stub-upload-and-scan-routes',
    register(server) {
      server.route({
        method: 'POST',
        path: `${STUB_UPLOAD_PATH}/{uploadId}`,
        options: {
          auth: false,
          plugins: { crumb: false },
          payload: {
            parse: true,
            multipart: { output: 'annotated' },
            maxBytes: ROUTE_BODY_CEILING_BYTES
          }
        },
        handler: takeUpload
      })
    }
  }
}
