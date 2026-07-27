import { getTraceId } from '@defra/hapi-tracing'
import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { documentClient } from '../../common/clients/document-client.js'

// EUDPA-106 Option 3-with-callbacks: landing endpoint for the cdp-uploader
// redirect. The backend record is created asynchronously by cdp-uploader's
// scan-result callback — there's a small window (seconds, sometimes) between
// the user's browser landing here and the callback arriving. If we redirect
// straight to /accompanying-documents inside that window the docs list is
// empty and the user has no idea what happened to their upload.
//
// So this handler polls the backend list a few times before redirecting: as
// soon as the notification has any docs, the callback has fired and we
// redirect; after MAX_ATTEMPTS refreshes we redirect anyway so a slow / lost
// callback doesn't wedge the user forever.
//
// The "has any docs" check works for the spike because test D starts from a
// notification with no prior docs. For real users mid-flow (who might already
// have completed docs on the notification), this would need to compare
// against a pre-upload count or check for a specific correlationId in the
// backend record. Captured as follow-up in findings.md.

const MAX_ATTEMPTS = 5
const REFRESH_INTERVAL_SECONDS = 2

const getAttempt = (request) => {
  const parsed = Number.parseInt(request.query.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const backendHasDocs = async (referenceNumber, traceId, logger) => {
  if (!referenceNumber) {
    return false
  }
  try {
    const response = await documentClient.list(referenceNumber, traceId)
    return (response.items ?? []).length > 0
  } catch (err) {
    logger.warn(`upload-successful: backend list failed: ${err.message}`)
    return false
  }
}

export const uploadSuccessfulHandler = async (request, h) => {
  const attempt = getAttempt(request)
  const referenceNumber = getSessionValue(request, sessionKeys.referenceNumber)
  const traceId = getTraceId() ?? ''

  if (await backendHasDocs(referenceNumber, traceId, request.logger)) {
    return h.redirect('/accompanying-documents')
  }

  if (attempt >= MAX_ATTEMPTS) {
    return h.redirect('/accompanying-documents')
  }

  return h.view('accompanying-documents/upload-successful', {
    pageTitle: 'Uploading your file',
    nextAttempt: attempt + 1,
    refreshIntervalSeconds: REFRESH_INTERVAL_SECONDS
  })
}
