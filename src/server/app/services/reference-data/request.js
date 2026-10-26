import Boom from '@hapi/boom'

import { config } from '../../../../config/config.js'
import { traceHeaders } from '../http/trace-headers.js'

const baseUrl = () => config.get('tradeImportsReferenceDataApi.baseUrl')

export const referenceDataUrl = (path) => new URL(`${baseUrl()}${path}`)

export const requestReferenceData = async (url, init, failureMessage) => {
  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...traceHeaders(),
      ...init?.headers
    }
  })

  if (!response.ok) {
    throw Object.assign(new Error(failureMessage), {
      status: response.status,
      statusText: response.statusText,
      url: url.toString()
    })
  }

  return response.json()
}

export const referenceDataUnavailable = (dataset, err) =>
  Boom.serverUnavailable('Reference data unavailable', { dataset, cause: err })
