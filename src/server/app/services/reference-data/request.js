import Boom from '@hapi/boom'

import { config } from '../../../../config/config.js'
import { measureExternalResponse } from '../../../common/helpers/metrics/external-call-metrics.js'
import { RefusedCallError } from '../http/dependency-error.js'
import { traceHeaders } from '../http/trace-headers.js'

const baseUrl = () => config.get('tradeImportsReferenceDataApi.baseUrl')

export const referenceDataUrl = (path) => new URL(`${baseUrl()}${path}`)

export const requestReferenceData = async (operation, url, init) => {
  const referenceDataCall = { dependency: 'reference-data', operation }
  const response = await measureExternalResponse(referenceDataCall, () =>
    fetch(url.toString(), {
      ...init,
      headers: { ...traceHeaders('application/json'), ...init?.headers }
    })
  )

  if (!response.ok) {
    throw Object.assign(new RefusedCallError(referenceDataCall, response), {
      url: url.toString()
    })
  }

  return response.json()
}

export const referenceDataUnavailable = (dataset, err) =>
  Boom.serverUnavailable('Reference data unavailable', { dataset, cause: err })
