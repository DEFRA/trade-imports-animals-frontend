import { getSessionValue } from './session-helpers.js'
import { notificationClient } from '../clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

export const fetchNotification = async (request, logger) => {
  const referenceNumber = getSessionValue(request, 'referenceNumber')
  const traceId = getTraceId() ?? ''
  if (!referenceNumber) return null
  const notification = await notificationClient.get(
    request,
    referenceNumber,
    traceId
  )
  logger.info(
    `Notification retrieved from notification client: ${referenceNumber}`
  )
  return notification
}

export const submitNotification = async (request, traceId, logger) => {
  try {
    const response = await notificationClient.submit(request, traceId)
    logger.info('Notification saved successfully')
    return response
  } catch (error) {
    logger.error(`Failed to submit notification: ${error.message}`)
    throw error
  }
}
