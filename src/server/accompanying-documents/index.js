import { accompanyingDocumentsController } from './controller/index.js'
import { config } from '../../config/config.js'
import { MAX_PAYLOAD_BYTES } from './document-upload-config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { oversizeFileView } from './controller/post/views.js'

// Safety net for users whose request bypasses the client-side preflight
// (no-JS, scripted clients): Hapi rejects an over-size multipart with Boom
// 413 before the handler runs, so we intercept here and render the upload
// page with an inline file-size error instead of returning a bare 413.
const handleOversizePayload = async (request, h) => {
  const isBoomOversize =
    request.response?.isBoom &&
    request.response.output?.statusCode === statusCodes.payloadTooLarge
  if (!isBoomOversize) {
    return h.continue
  }
  return oversizeFileView(request, h)
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
