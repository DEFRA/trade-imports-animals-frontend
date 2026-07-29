// EUDPA-106 (Option 3-with-callbacks) DEAD MODULE — kept for the follow-up
// implementation ticket to remove. The `GET /accompanying-documents/status`
// route this handler is registered against was called by client-side JS in
// `src/client/javascripts/accompanying-documents.js` to poll for scan-status
// updates without a full page reload. Under Option 3 the docs list is
// server-rendered from the backend on each page load, so the client-side
// polling is never triggered — the JS initialiser bails on its early return
// because the `data-max-file-size` attribute (which used to gate polling
// initialisation) has been removed from the form template.
// See findings.md "Deferred cleanup" for the removal list.
import { getTraceId } from '@defra/hapi-tracing'
import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { getDocumentsWithStatus } from './page-model.js'

export const statusHandler = async (request, h) => {
  const traceId = getTraceId() ?? ''
  const rawDocuments = getSessionValue(request, sessionKeys.documents) ?? []
  const documentsWithStatus = await getDocumentsWithStatus(
    rawDocuments,
    traceId,
    request.logger
  )
  return h.response({ documents: documentsWithStatus }).code(statusCodes.ok)
}
