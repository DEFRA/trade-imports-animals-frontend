import { getTraceId } from '@defra/hapi-tracing'
import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import {
  buildPageModel,
  getAttempt,
  getDocumentsWithStatus
} from './page-model.js'

export const getHandler = async (request, h) => {
  const traceId = getTraceId() ?? ''
  const attempt = getAttempt(request)
  const rawDocuments = getSessionValue(request, sessionKeys.documents) ?? []
  const referenceNumber = getSessionValue(request, sessionKeys.referenceNumber)

  const documentsWithStatus = await getDocumentsWithStatus(
    rawDocuments,
    traceId,
    request.logger
  )

  return h.view(
    'accompanying-documents/index',
    buildPageModel(documentsWithStatus, attempt, { referenceNumber })
  )
}
