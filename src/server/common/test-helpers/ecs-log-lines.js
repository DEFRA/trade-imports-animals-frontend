import { Writable } from 'node:stream'
import { pino } from 'pino'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { createLogger } from '../helpers/logging/logger.js'
import { buildEcsPinoOptions } from '../helpers/logging/logger-options.js'

/**
 * Sends the lines the module-level logger writes during each test of the
 * enclosing `describe` through a pino logger with the deployed ECS format, and
 * keeps the JSON it writes, parsed. Restores the logger afterwards.
 *
 * @returns {{
 *   lines: () => object[],
 *   externalCallLines: () => object[],
 *   onlyExternalCallLine: () => object
 * }} the parsed lines, every one or only the external-call ones, in the order
 *   written; `onlyExternalCallLine` fails the test unless exactly one
 *   external-call line was written, and returns it
 */
export const recordEcsLogLines = () => {
  const lines = []
  const ecsLogger = pino(
    buildEcsPinoOptions({ level: 'info' }),
    new Writable({
      write(chunk, _encoding, done) {
        lines.push(JSON.parse(chunk))
        done()
      }
    })
  )
  let spies = []

  beforeEach(() => {
    lines.length = 0
    spies = ['info', 'warn', 'error'].map((level) =>
      vi
        .spyOn(createLogger(), level)
        .mockImplementation((...args) => ecsLogger[level](...args))
    )
  })

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore())
  })

  const externalCallLines = () =>
    lines.filter((line) => line.event?.category === 'external-call')

  const onlyExternalCallLine = () => {
    const written = externalCallLines()
    expect(written).toHaveLength(1)
    return written[0]
  }

  return { lines: () => [...lines], externalCallLines, onlyExternalCallLine }
}
