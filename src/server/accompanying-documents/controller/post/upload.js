import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { documentClient } from '../../../common/clients/document-client.js'
import {
  ALLOWED_TYPES,
  MAX_FILE_SIZE_BYTES
} from '../../document-upload-config.js'

const ALLOWED_MIME_TYPES = ALLOWED_TYPES.map((type) => type.mime)

const initiateUpload = async (request, uploadDetails, traceId) => {
  const notificationRef = getSessionValue(request, sessionKeys.referenceNumber)
  if (!notificationRef) {
    request.logger.warn(
      'Document upload initiated without referenceNumber in session; backend will reject'
    )
  }
  return documentClient.initiate(
    notificationRef,
    {
      ...uploadDetails,
      maxFileSize: MAX_FILE_SIZE_BYTES,
      mimeTypes: ALLOWED_MIME_TYPES
    },
    traceId
  )
}

const buildMultipartBody = (fileData) => {
  const contentType =
    fileData.headers?.['content-type'] ?? 'application/octet-stream'
  const blob = new Blob([fileData.payload], { type: contentType })
  const formData = new FormData()
  formData.append('file', blob, fileData.filename ?? 'upload')
  return formData
}

export const uploadDocument = async (
  request,
  fileData,
  uploadDetails,
  traceId
) => {
  const { uploadId } = await initiateUpload(request, uploadDetails, traceId)
  request.logger.info(`Document upload initiated: uploadId=${uploadId}`)

  await documentClient.uploadFile(
    uploadId,
    buildMultipartBody(fileData),
    traceId
  )
  request.logger.info(`File uploaded via backend: uploadId=${uploadId}`)

  return uploadId
}
