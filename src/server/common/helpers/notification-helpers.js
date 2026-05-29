import { notificationClient } from '../clients/notification-client.js'
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

export const deleteNotification = async (request, logger, referenceNumber) => {
  const traceId = getTraceId() ?? ''
  try {
    const response = await notificationClient.softDelete(
      request,
      referenceNumber,
      traceId
    )
    logger.info(`Notification soft-deleted: ${referenceNumber}`)
    return response
  } catch (err) {
    logger.error(`Failed to delete notification: ${err.message}`)
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
