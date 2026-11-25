import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'

export const traceHeaders = (contentType) => ({
  ...(contentType ? { 'Content-Type': contentType } : {}),
  [config.get('tracing.header')]: getTraceId() ?? ''
})
