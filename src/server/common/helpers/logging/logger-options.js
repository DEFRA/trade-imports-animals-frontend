import { ecsFormat } from '@elastic/ecs-pino-format'
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')

/** The pino options that write each line as ECS JSON, as deployed. */
export const ecsFormatOptions = ecsFormat({
  serviceVersion,
  serviceName
})

const formatters = {
  ecs: ecsFormatOptions,
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

/**
 * Adds the trace id of the request in progress to a line.
 *
 * @returns {{ trace?: { id: string } }} the trace fields
 */
export const traceMixin = () => {
  const mixinValues = {}
  const traceId = getTraceId()
  if (traceId) {
    mixinValues.trace = { id: traceId }
  }
  return mixinValues
}

export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format],
  nesting: true,
  mixin: traceMixin
}
