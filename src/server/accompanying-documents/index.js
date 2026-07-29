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

// EUDPA-106 (Option 3-with-callbacks) DEAD CODE — kept for the follow-up
// implementation ticket to remove alongside the byte-proxy teardown (AC4).
// The `POST /accompanying-documents` route this hook is attached to is no
// longer reachable — the form's action was rewired in step 4 to
// `/upload-and-scan/<uploadId>` (direct to cdp-uploader via the nginx sidecar
// bypass), so hapi's payload machinery never fires and this onPreResponse
// hook is never invoked. See findings.md "Deferred cleanup" for the removal
// list.
//
// Original intent (preserved for context): safety net for users whose request
// bypasses the client-side preflight (no-JS, scripted clients). Hapi rejected
// an over-size multipart with Boom 413 before the handler ran, so the
// controller's `loadUploadState` never executed — this hook re-fetched the
// session documents and re-rendered the upload page with an inline file-size
// error instead of returning a bare 413.
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
  request.logger.warn(
    { contentLength: request.headers['content-length'] },
    'Oversize multipart upload rejected by route maxBytes'
  )
  // The 413 is thrown during payload parsing, before crumb's onPostAuth
  // runs, so a client without a crumb cookie has no token yet — mint one so
  // the re-rendered form's hidden crumb field passes validation on re-submit.
  const crumb =
    request.state.crumb ?? request.server.plugins.crumb.generate(request, h)
  return oversizeFileView(h, documentsWithStatus, crumb)
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
        // EUDPA-106 (Option 3-with-callbacks) DEAD ROUTE — kept for the
        // follow-up ticket to remove. Client-side JS used to poll this for
        // scan status; under Option 3 the docs list is server-rendered from
        // the backend on each page load, so no JS polling occurs. See
        // findings.md "Deferred cleanup".
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
          path: '/accompanying-documents/upload-successful',
          ...accompanyingDocumentsController.uploadSuccessful
        },
        {
          method: 'GET',
          path: '/accompanying-documents/{uploadId}/file',
          ...accompanyingDocumentsController.download
        },
        // EUDPA-106 (Option 3-with-callbacks) DEAD ROUTE — the form POSTs
        // direct to /upload-and-scan/<uploadId> now (see add-document-form.njk).
        // Nothing routes to this handler. Kept for the follow-up ticket to
        // remove alongside the whole backend byte-proxy teardown (AC4). See
        // findings.md "Deferred cleanup".
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
