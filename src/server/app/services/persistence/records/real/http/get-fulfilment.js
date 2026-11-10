import { statusCodes } from '../../../../../../common/constants/status-codes.js'
import { backendFetch } from '../../../../../../common/helpers/call-counts/backend-fetch.js'
import { currentOrganisationId } from '../../../../../../common/helpers/organisation-id.js'
import { notificationsUrl } from '../config.js'
import { failed } from './failed.js'
import { headers } from './headers.js'
import { logger } from '../logger.js'

export const getFulfilment = async (journeyId) => {
  const response = await backendFetch(
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
      { journeyId, organisationId: currentOrganisationId() },
      'Backend refused fulfilment read for another organisation'
    )
    return undefined
  }
  if (!response.ok) {
    throw await failed('get fulfilment', response)
  }
  return response.json()
}
