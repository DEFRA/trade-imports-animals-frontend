import { pino } from 'pino'

import { loggerOptions } from './logger-options.js'

const { transport, ...options } = loggerOptions
let output = transport ? pino.transport(transport) : pino.destination(1)

const logger = pino(options, { write: (line) => output.write(line) })

function createLogger() {
  return logger
}

/**
 * Sends every line the module logger and its child loggers write to `stream`
 * instead of their current output, until the returned function is called.
 *
 * @param {{ write: (line: string) => void }} stream - where the lines go
 * @returns {() => void} puts back the output the lines went to before
 */
function writeLogsTo(stream) {
  const previous = output
  output = stream
  return () => {
    output = previous
  }
}

export { createLogger, writeLogsTo }
