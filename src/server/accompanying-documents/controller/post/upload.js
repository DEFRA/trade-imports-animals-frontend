import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { documentClient } from '../../../common/clients/document-client.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
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

const proxyFileToCdpUploader = async (uploadUrl, fileData) => {
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: buildMultipartBody(fileData),
    redirect: 'manual'
  })
  // cdp-uploader redirects (302) on success; Node.js fetch with
  // redirect:'manual' returns the actual redirect status, not status 0.
  // Local mock returns 200 directly. Fail only on 4xx/5xx.
  if (response.status >= statusCodes.badRequest) {
    throw new Error(
      `cdp-uploader returned unexpected status ${response.status}`
    )
  }
}

export const uploadDocument = async (
  request,
  fileData,
  uploadDetails,
  traceId
) => {
  const { uploadId, uploadUrl } = await initiateUpload(
    request,
    uploadDetails,
    traceId
  )
  request.logger.info(`Document upload initiated: uploadId=${uploadId}`)

  await proxyFileToCdpUploader(uploadUrl, fileData)
  request.logger.info(`File proxied to cdp-uploader: uploadId=${uploadId}`)

  return uploadId
}
