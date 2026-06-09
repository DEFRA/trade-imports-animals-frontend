import { getTraceId } from '@defra/hapi-tracing'

import { accompanyingDocumentsController } from './controller/index.js'
import { config } from '../../config/config.js'
import { MAX_PAYLOAD_BYTES } from './document-upload-config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { getSessionValue } from '../common/helpers/session-helpers.js'
import { oversizeFileView } from './controller/post/views.js'
import { getDocumentsWithStatus } from './controller/page-model.js'

const isBoomOversize = (request) =>
  request.response?.isBoom &&
  request.response.output?.statusCode === statusCodes.payloadTooLarge

// Safety net for users whose request bypasses the client-side preflight
// (no-JS, scripted clients): Hapi rejects an over-size multipart with Boom
// 413 before the handler runs, so the controller's `loadUploadState` never
// executes — we re-fetch the session documents here and render the upload
// page with an inline file-size error instead of returning a bare 413.
const handleOversizePayload = async (request, h) => {
  if (!isBoomOversize(request)) {
    return h.continue
  }
  const documents = getSessionValue(request, sessionKeys.documents) ?? []
  const documentsWithStatus = await getDocumentsWithStatus(
    documents,
    getTraceId() ?? '',
    request.logger
  )
  return oversizeFileView(h, documentsWithStatus)
}

/**
 * Sets up the routes used in the accompanying documents page.
 * These routes are registered in src/server/router.js.
 */
export const accompanyingDocuments = {
  plugin: {
    name: 'accompanying-documents',
    register(server) {
      const authEnabled = config.get('auth.enabled')
      server.route([
        {
          method: 'GET',
          path: '/accompanying-documents',
          ...accompanyingDocumentsController.get
        },
        {
          method: 'GET',
          path: '/accompanying-documents/status',
          options: authEnabled
            ? { auth: { strategy: 'session', mode: 'try' } }
            : { auth: false },
          ...accompanyingDocumentsController.status
        },
        {
          method: 'GET',
          path: '/accompanying-documents/{uploadId}/file',
          ...accompanyingDocumentsController.download
        },
        {
          method: 'POST',
          path: '/accompanying-documents',
          options: {
            // Spread only handler so route-level payload config takes precedence over any controller options
            handler: accompanyingDocumentsController.post.handler,
            payload: {
              maxBytes: MAX_PAYLOAD_BYTES,
              parse: true,
              multipart: { output: 'annotated' }
            },
            ext: {
              onPreResponse: { method: handleOversizePayload }
            }
          }
        }
      ])
    }
  }
}
