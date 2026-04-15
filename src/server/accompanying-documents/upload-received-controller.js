import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import { documentClient } from '../common/clients/document-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const MAX_POLLING_ATTEMPTS = 10

export const uploadReceivedController = {
  get: {
    async handler(request, h) {
      const uploadId = getSessionValue(request, 'uploadId')

      if (!uploadId) {
        return h.redirect('/accompanying-documents')
      }

      const attempt = parseInt(request.query.attempt ?? '0', 10)

      // Clear uploadUrl immediately so the upload page cannot be resubmitted
      // with the same uploadId (cdp-uploader rejects re-uploads to a used session).
      // uploadId is kept until the scan reaches a terminal state so we can poll status.
      setSessionValue(request, 'uploadUrl', null)

      const traceId = getTraceId() ?? ''

      let scanStatus = 'PENDING'
      try {
        const status = await documentClient.getStatus(uploadId, traceId)
        scanStatus = status.scanStatus
      } catch (err) {
        request.logger.error(
          `Failed to get scan status for uploadId=${uploadId}: ${err.message}`
        )
      }

      if (scanStatus === 'COMPLETE' || scanStatus === 'REJECTED') {
        setSessionValue(request, 'uploadId', null)
      }

      const timedOut =
        scanStatus === 'PENDING' && attempt >= MAX_POLLING_ATTEMPTS

      const pageTitle =
        scanStatus === 'COMPLETE'
          ? 'Document uploaded successfully'
          : scanStatus === 'REJECTED'
            ? 'There is a problem'
            : timedOut
              ? 'This is taking longer than expected'
              : 'Your document is being checked'

      return h.view('accompanying-documents/upload-received', {
        pageTitle,
        heading: pageTitle,
        scanStatus,
        attempt,
        nextAttempt: attempt + 1,
        timedOut
      })
    }
  }
}
