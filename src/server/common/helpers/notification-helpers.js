import { getSessionValue } from './session-helpers.js'
import { notificationClient } from '../clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

export const fetchNotification = async (request, logger) => {
  const referenceNumber = getSessionValue(request, 'referenceNumber')
  const traceId = getTraceId() ?? ''
  if (!referenceNumber) return null
  try {
    const notification = await notificationClient.get(
      request,
      referenceNumber,
      traceId
    )
    logger.info(
      `Notification retrieved from notification client: ${referenceNumber}`
    )
    return notification
  } catch (error) {
    logger.error(`Failed to fetch notification: ${error.message}`)
    return null
  }
}

export const submitNotification = async (request, logger) => {
  const traceId = getTraceId() ?? ''
  try {
    const response = await notificationClient.submit(request, traceId)
    logger.info('Notification saved successfully')
    return response
  } catch (error) {
    logger.error(`Failed to submit notification: ${error.message}`)
    throw error
  }
}
