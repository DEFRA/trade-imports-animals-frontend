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
// soon as this tab's specific upload appears in the list (identified by the
// correlationId minted at /initiate time and threaded through the redirect
// URL), the callback has fired for THIS upload and we redirect; after
// MAX_ATTEMPTS refreshes we redirect anyway so a slow / lost callback doesn't
// wedge the user forever.
//
// Multi-tab safe: each tab mints its own correlationId in get.js, so Tab 1's
// callback landing does not cause Tab 2's wait page to redirect prematurely.

// 10 attempts × 2s = 20s ceiling on the wait window — comfortably above the
// worst-case local mock-scanner + callback round-trip we've observed
// (~7-10s), so a slow tick doesn't cause a premature give-up. If a callback
// really is lost, the user still bails out to /accompanying-documents rather
// than looping forever.
const MAX_ATTEMPTS = 10
const REFRESH_INTERVAL_SECONDS = 2

const getAttempt = (request) => {
  const parsed = Number.parseInt(request.query.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const backendHasCorrelationId = async (
  referenceNumber,
  correlationId,
  traceId,
  logger
) => {
  if (!referenceNumber || !correlationId) {
    return false
  }
  try {
    const response = await documentClient.list(referenceNumber, traceId)
    return (response.items ?? []).some(
      (item) => item.correlationId === correlationId
    )
  } catch (err) {
    logger.warn(`upload-successful: backend list failed: ${err.message}`)
    return false
  }
}

export const uploadSuccessfulHandler = async (request, h) => {
  const attempt = getAttempt(request)
  const correlationId = request.query.corr
  const referenceNumber = getSessionValue(request, sessionKeys.referenceNumber)
  const traceId = getTraceId() ?? ''

  // Guard: an empty ?corr= would render a wait page whose meta-refresh URL
  // poisons itself with `correlationId=undefined`. Nothing to wait for, so
  // fall straight back to the docs list.
  if (!correlationId) {
    return h.redirect('/accompanying-documents')
  }

  if (
    await backendHasCorrelationId(
      referenceNumber,
      correlationId,
      traceId,
      request.logger
    )
  ) {
    return h.redirect('/accompanying-documents')
  }

  if (attempt >= MAX_ATTEMPTS) {
    return h.redirect('/accompanying-documents')
  }

  return h.view('accompanying-documents/upload-successful', {
    pageTitle: 'Uploading your file',
    nextAttempt: attempt + 1,
    refreshIntervalSeconds: REFRESH_INTERVAL_SECONDS,
    correlationId
  })
}
