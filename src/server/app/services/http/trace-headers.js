import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'

export const traceHeaders = (contentType) => ({
  ...(contentType ? { 'Content-Type': contentType } : {}),
  [config.get('tracing.header')]: getTraceId() ?? ''
})

export const failedResponse = (action, response) => {
  const error = new Error(
    `Failed to ${action}: ${response.status} ${response.statusText}`
  )
  error.status = response.status
  error.statusText = response.statusText
  return error
}
