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

export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...optionsForFormat[logConfig.format](),
  mixin: traceMixin,
  nesting: true
}
