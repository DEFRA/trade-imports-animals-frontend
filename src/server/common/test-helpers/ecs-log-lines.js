import { afterEach, beforeEach, expect } from 'vitest'

import { config } from '../../../config/config.js'
import { createLogger, writeLogsTo } from '../helpers/logging/logger.js'

/**
 * Keeps, parsed, every line the module logger and its child loggers write at
 * the configured log level during each test of the enclosing `describe`, in
 * place of the logger's output. Needs `LOG_FORMAT` `ecs`. Puts back the logger's
 * level and output afterwards.
 *
 * @returns {{
 *   lines: () => object[],
 *   externalCallLines: () => object[],
 *   externalCallLine: (action: string) => object | undefined,
 *   onlyExternalCallLine: () => object
 * }} the parsed lines, every one or only the external-call ones, in the order
 *   written; `externalCallLine` returns the first external-call line with the
 *   given `event.action`, such as `defra-id/jwks`; `onlyExternalCallLine`
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

  const externalCallLines = () =>
    lines.filter((line) => line.event?.category === 'external-call')

  const externalCallLine = (action) =>
    externalCallLines().find(({ event }) => event.action === action)

  const onlyExternalCallLine = () => {
    const written = externalCallLines()
    expect(written).toHaveLength(1)
    return written[0]
  }

  return {
    lines: () => [...lines],
    externalCallLines,
    externalCallLine,
    onlyExternalCallLine
  }
}
