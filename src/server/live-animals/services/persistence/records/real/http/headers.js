import { getTraceId } from '@defra/hapi-tracing'
import { tracingHeader } from '../config.js'

export const headers = () => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? ''
})
