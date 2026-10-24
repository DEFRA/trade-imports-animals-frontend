import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../../../config/config.js'

export const traceHeaders = () => ({
  [config.get('tracing.header')]: getTraceId() ?? ''
})
