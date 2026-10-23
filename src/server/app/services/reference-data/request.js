import Boom from '@hapi/boom'

import { createLogger } from '../../../common/helpers/logging/logger.js'

const logger = createLogger()

const baseUrl =
  process.env.TRADE_IMPORTS_REFERENCE_DATA_URL ?? 'http://localhost:8086'

export const referenceDataUrl = (path) => new URL(`${baseUrl}${path}`)

const fetchJson = async (url, init, failureMessage) => {
  const response = await fetch(url.toString(), {
    ...init,
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    throw Object.assign(new Error(failureMessage), {
      status: response.status,
      statusText: response.statusText
    })
  }

  return response.json()
}

export const requestReferenceData = async (url, init, failureMessage) => {
  try {
    return await fetchJson(url, init, failureMessage)
  } catch (err) {
    logger.error({ err, url: url.toString() }, failureMessage)
    throw err
  }
}

export const referenceDataUnavailable = (dataset, err) =>
  Boom.serverUnavailable('Reference data unavailable', { dataset, cause: err })
