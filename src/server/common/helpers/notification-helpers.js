import { getSessionValue } from './session-helpers.js'
import { notificationClient } from '../clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

export function fetchNotification(request, logger) {
  const referenceNumber = getSessionValue(request, 'referenceNumber')
  const traceId = getTraceId() ?? ''
  if (referenceNumber) {
    notificationClient.get(request, referenceNumber, traceId)
    logger.info(
      `Notification retrieved from notification client: ${referenceNumber}`
    )
  }
  return referenceNumber
}

export async function submitNotification(request, traceId, logger) {
  try {
    const response = await notificationClient.submit(request, traceId)
    logger.info('Notification saved successfully')
    return response
  } catch (error) {
    logger.error(`Failed to submit notification: ${error.message}`)
  }
}
