import { ecsFormat } from '@elastic/ecs-pino-format'
import { getTraceId } from '@defra/hapi-tracing'

import { config } from '../../../../config/config.js'

const logConfig = config.get('log')

const traceMixin = () => {
  const mixinValues = {}
  const traceId = getTraceId()
  if (traceId) {
    mixinValues.trace = { id: traceId }
  }
  return mixinValues
}

const optionsForFormat = {
  ecs: () =>
    ecsFormat({
      serviceVersion: config.get('serviceVersion'),
      serviceName: config.get('serviceName')
    }),
  'pino-pretty': () => ({ transport: { target: 'pino-pretty' } })
}

const pinoOptions = ({ format, level }) => ({
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level,
  ...optionsForFormat[format](),
  mixin: traceMixin
})

/**
 * The pino options a deployed line is written with: ECS JSON, the configured
 * redaction and the trace id of the request in progress.
 *
 * @param {{ level: string }} options - the lowest level written
 * @returns {import('pino').LoggerOptions} the pino options
 */
export const buildEcsPinoOptions = ({ level }) =>
  pinoOptions({ format: 'ecs', level })

export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  ...pinoOptions({ format: logConfig.format, level: logConfig.level }),
  nesting: true
}
