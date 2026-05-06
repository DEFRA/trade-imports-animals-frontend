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
