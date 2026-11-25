import { ecsFormat } from '@elastic/ecs-pino-format'
import { getTraceId } from '@defra/hapi-tracing'
import { stdSerializers } from 'pino'

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

const errorFieldsOf = (err, ecsError) => {
  const code = err.code ?? err.cause?.code
  return {
    ...ecsError,
    stack_trace: stdSerializers.err(err).stack,
    ...(code === undefined ? {} : { code })
  }
}

const ecsOptions = () => {
  const options = ecsFormat({
    serviceVersion: config.get('serviceVersion'),
    serviceName: config.get('serviceName')
  })
  const formatEcsFields = options.formatters.log
  const formatFields = (fields) => {
    const ecsFields = formatEcsFields(fields)
    return fields.err instanceof Error
      ? { ...ecsFields, error: errorFieldsOf(fields.err, ecsFields.error) }
      : ecsFields
  }
  return {
    ...options,
    formatters: { ...options.formatters, log: formatFields }
  }
}

const optionsForFormat = {
  ecs: ecsOptions,
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
