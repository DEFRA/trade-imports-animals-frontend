import { statusCodes } from '../../../../../../common/constants/status-codes.js'
import { backendFetch } from '../../../../../../common/helpers/backend-client/backend-fetch.js'
import { currentOrganisationId } from '../../../../../../common/helpers/organisation-id.js'
import { notificationsUrl } from '../config.js'
import { failed } from './failed.js'
import { headers } from './headers.js'
import { logger } from '../logger.js'

export const getFulfilment = async (journeyId) => {
  const operation = 'get-fulfilment'
  const response = await backendFetch(
    operation,
    `${notificationsUrl}/${journeyId}/fulfilments`,
    {
      method: 'GET',
      headers: headers()
    }
  )
  if (response.status === statusCodes.notFound) {
    return undefined
  }
  if (response.status === statusCodes.forbidden) {
    logger.warn(
      `Backend refused fulfilment read for notification ${journeyId}, organisation ${currentOrganisationId()}`
    )
    return undefined
  }
  if (!response.ok) {
    throw await failed(operation, response)
  }
  return response.json()
}
