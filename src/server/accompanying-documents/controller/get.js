import { getTraceId } from '@defra/hapi-tracing'
import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { cdpUploaderClient } from '../../common/clients/cdp-uploader-client.js'
import { config } from '../../../config/config.js'
import {
  buildPageModel,
  getAttempt,
  getDocumentsWithStatus
} from './page-model.js'

// EUDPA-106 spike: initiate a cdp-uploader upload session on every GET so the
// view has an uploadUrl + uploadId to hand off to the form (step 4 rewires the
// form's action). Failure is swallowed so the page still renders — the spike's
// new flow degrades gracefully to the existing back-end-proxied path until
// step 4 lands. Real error handling lives in the follow-up implementation
// ticket.
const initiateCdpUploaderSession = async (logger) => {
  try {
    const result = await cdpUploaderClient.initiate({
      redirect: config.get('cdpUploader.redirectPath'),
      s3Bucket: config.get('cdpUploader.documentsBucket'),
      maxFileSize: config.get('cdpUploader.maxFileSize'),
      mimeTypes: config.get('cdpUploader.mimeTypes').split(',')
    })
    logger.info({ uploadId: result?.uploadId }, 'cdp-uploader /initiate ok')
    return result
  } catch (err) {
    logger.warn(`cdp-uploader /initiate failed: ${err.message}`)
    return null
  }
}

export const getHandler = async (request, h) => {
  const traceId = getTraceId() ?? ''
  const attempt = getAttempt(request)
  const rawDocuments = getSessionValue(request, sessionKeys.documents) ?? []
  const referenceNumber = getSessionValue(request, sessionKeys.referenceNumber)

  const [documentsWithStatus, cdpUploaderSession] = await Promise.all([
    getDocumentsWithStatus(rawDocuments, traceId, request.logger),
    initiateCdpUploaderSession(request.logger)
  ])

  // EUDPA-106 spike: /upload-successful runs on a fresh redirect from
  // cdp-uploader and needs to know which upload it is — stash the session on
  // yar so it can be recovered without the browser round-tripping any id.
  if (cdpUploaderSession) {
    setSessionValue(request, sessionKeys.currentUpload, cdpUploaderSession)
  }

  return h.view(
    'accompanying-documents/index',
    buildPageModel(documentsWithStatus, attempt, {
      referenceNumber,
      cdpUploaderSession
    })
  )
}
