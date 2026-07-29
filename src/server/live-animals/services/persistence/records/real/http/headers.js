import { getTraceId } from '@defra/hapi-tracing'
import { tracingHeader } from '../config.js'

export const headers = (owner) => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? '',
  'X-Owner-Id': owner?.sub ?? '',
  'X-Owner-Organisation': owner?.organisation ?? ''
})
