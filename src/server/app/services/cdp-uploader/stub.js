import { randomUUID } from 'node:crypto'

const REJECTED_FILENAME = /oversize|too-?big/i
const WRONG_TYPE_FILENAME = /\.(txt|zip|exe)$/i

const FILE_TOO_LARGE = 'FILE_TOO_LARGE'
const FILE_INVALID_TYPE = 'FILE_INVALID_TYPE'

const HTTP_STATUS_NOT_FOUND = 404

// The transport ceiling for the stand-in route, not the file cap. cdp-uploader
// answers an oversize file with a rejected file entry, not by refusing the
// request, so the body has to reach the handler for the stub to answer the same
// way. Without a cap here hapi's 1 MB default stands and every document a
// trader attaches is refused with a 413 before the handler runs. The file cap
// is whatever the session was opened with, enforced in fileErrorCodeFor.
const ROUTE_BODY_CEILING_MB = 64
const BYTES_PER_MEGABYTE = 1_000_000
const ROUTE_BODY_CEILING_BYTES = ROUTE_BODY_CEILING_MB * BYTES_PER_MEGABYTE

const sessions = new Map()

const fileErrorCodeFor = ({ filename, contentLength, maxFileSize }) => {
  if (WRONG_TYPE_FILENAME.test(filename)) {
    return FILE_INVALID_TYPE
  }
  if (REJECTED_FILENAME.test(filename)) {
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
  open: async ({ correlationId, returnPath, maxFileSize }) => {
    const uploadId = randomUUID()
    sessions.set(uploadId, { correlationId, returnPath, maxFileSize, form: {} })
    return { uploadId, uploadPath: `${STUB_UPLOAD_PATH}/${uploadId}` }
  },

  read: async (uploadId) => {
    const session = sessions.get(uploadId)
    if (!session) {
      const error = new Error(`Failed to read an upload session: ${uploadId}`)
      error.status = HTTP_STATUS_NOT_FOUND
      throw error
    }
    return { uploadStatus: 'pending', form: session.form }
  }
}

export const STUB_UPLOAD_PATH = '/stub-upload-and-scan'

const textFieldsOf = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value === 'string')
  )

// Stands in for the platform's /upload-and-scan bypass, which no stub run has
// in front of it: it takes the browser's multipart POST, remembers the fields
// alongside the file, and returns the browser the way cdp-uploader does.
const takeUpload = (request, h) => {
  const session = sessions.get(request.params.uploadId)
  if (!session) {
    return h.response().code(HTTP_STATUS_NOT_FOUND)
  }
  const payload = request.payload ?? {}
  const file = payload.file ?? {}
  session.form = {
    ...textFieldsOf(payload),
    file: fileEntryFor({
      filename: file.filename ?? '',
      contentType: file.headers?.['content-type'],
      contentLength: file.payload?.length ?? 0,
      maxFileSize: session.maxFileSize
    })
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
