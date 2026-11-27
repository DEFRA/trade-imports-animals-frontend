import { statusCodes } from '../../../../../../common/constants/status-codes.js'
import { currentOrganisationId } from '../../../../../../common/helpers/organisation-id.js'
import { notificationsUrl } from '../config.js'
import { journeyReferenceFields } from '../journey-reference-fields.js'
import { refuseUnlessOk, requestBackend } from './send.js'
import { logger } from '../logger.js'

export const getFulfilment = async (journeyId) => {
  const operation = 'get-fulfilment'
  const response = await requestBackend(
    operation,
    `${notificationsUrl}/${journeyId}/fulfilments`,
    { method: 'GET' }
  )
  if (response.status === statusCodes.notFound) {
    return undefined
  }
  if (response.status === statusCodes.forbidden) {
    logger.warn(
      journeyReferenceFields(journeyId),
      `Backend refused fulfilment read for organisation ${currentOrganisationId()}: ${response.status}`
    )
    return undefined
  }
  return (await refuseUnlessOk(operation, response, { journeyId })).json()
}
