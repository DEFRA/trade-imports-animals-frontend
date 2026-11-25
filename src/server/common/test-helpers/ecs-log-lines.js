import { afterEach, beforeEach, expect } from 'vitest'

import { config } from '../../../config/config.js'
import { createLogger, writeLogsTo } from '../helpers/logging/logger.js'

/**
 * Matches the fields the ECS format writes on every line, whatever the code
 * logs: spread it into an expected line to compare the rest exactly.
 */
export const ECS_PLATFORM_FIELDS = {
  '@timestamp': expect.any(String),
  'ecs.version': expect.any(String),
  'event.dataset': expect.any(String),
  'host.hostname': expect.any(String),
  'process.pid': expect.any(Number),
  'service.name': expect.any(String)
}

/**
 * Keeps, parsed, every line the module logger and its child loggers write at
 * the configured log level during each test of the enclosing `describe`, in
 * place of the logger's output. Needs `LOG_FORMAT` `ecs`. Puts back the logger's
 * level and output afterwards.
 *
 * @returns {{
 *   lines: () => object[],
 *   linesWithMessage: (message: string) => object[],
 *   linesAtLevel: (level: string) => object[],
 *   levelledMessages: () => Array<{ level: string, message: string }>,
 *   linesBesideExternalCalls: () => object[],
 *   externalCallLines: () => object[],
 *   externalCallLine: (action: string) => object | undefined,
 *   onlyExternalCallLine: () => object
 * }} readers of the parsed lines, each in the order written: every line; those
 *   with the given message; those at the given `log.level`; every line as its
 *   `{ level, message }`; every line but the external-call ones; only the
 *   external-call ones; the first external-call line with the given
 *   `event.action`, such as `defra-id/jwks`; and `onlyExternalCallLine`, which
 *   fails the test unless exactly one external-call line was written, and
 *   returns it
 */
export const recordEcsLogLines = () => {
  const logger = createLogger()
  const lines = []
  let levelBefore
  let restoreOutput

  beforeEach(() => {
    lines.length = 0
    levelBefore = logger.level
    logger.level = config.get('log.level')
    restoreOutput = writeLogsTo({
      write: (line) => lines.push(JSON.parse(line))
    })
  })

  afterEach(() => {
    restoreOutput()
    logger.level = levelBefore
  })

  const isExternalCallLine = (line) => line.event?.category === 'external-call'

  const linesWithMessage = (message) =>
    lines.filter((line) => line.message === message)

  const linesAtLevel = (level) =>
    lines.filter((line) => line['log.level'] === level)

  const levelledMessages = () =>
    lines.map((line) => ({ level: line['log.level'], message: line.message }))

  const linesBesideExternalCalls = () =>
    lines.filter((line) => !isExternalCallLine(line))

  const externalCallLines = () => lines.filter(isExternalCallLine)

  const externalCallLine = (action) =>
    externalCallLines().find(({ event }) => event.action === action)

  const onlyExternalCallLine = () => {
    const written = externalCallLines()
    expect(written).toHaveLength(1)
    return written[0]
  }

  return {
    lines: () => [...lines],
    linesWithMessage,
    linesAtLevel,
    levelledMessages,
    linesBesideExternalCalls,
    externalCallLines,
    externalCallLine,
    onlyExternalCallLine
  }
}
