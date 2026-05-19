import { getSessionValue } from './session-helpers.js'
import { notificationClient } from '../clients/notification-client.js'
import { sessionKeys } from '../constants/session-keys.js'
import { getTraceId } from '@defra/hapi-tracing'

export const saveNotification = async (request, logger) => {
  const traceId = getTraceId() ?? ''
  try {
    const response = await notificationClient.save(request, traceId)
    logger.info('Notification saved successfully')
    return response
  } catch (err) {
    logger.error(`Failed to submit notification: ${err.message}`)
    throw err
  }
}

export const submitNotification = async (request, logger, referenceNumber) => {
  const traceId = getTraceId() ?? ''
  try {
    const response = await notificationClient.submitNotification(
      request,
      referenceNumber,
      traceId
    )
    logger.info(`Notification submitted: ${referenceNumber}`)
    return response
  } catch (err) {
    logger.error(`Failed to submit notification: ${err.message}`)
    throw err
  }
}

export const fetchNotification = async (request, logger) => {
  const referenceNumber = getSessionValue(request, sessionKeys.referenceNumber)
  if (!referenceNumber) {
    return null
  }

  const traceId = getTraceId() ?? ''
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
  } catch (err) {
    logger.error(`Failed to get notification: ${err.message}`)
    return null
  }
}
