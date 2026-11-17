import { Writable } from 'node:stream'
import { pino } from 'pino'
import { afterEach, beforeEach, vi } from 'vitest'

import { createLogger } from '../helpers/logging/logger.js'
import {
  ecsFormatOptions,
  traceMixin
} from '../helpers/logging/logger-options.js'

const LEVELS = ['info', 'warn', 'error']

/**
 * Sends the lines the module-level logger writes during each test of the
 * enclosing `describe` through a pino logger with the deployed ECS format, and
 * keeps the JSON it writes, parsed. Restores the logger afterwards.
 *
 * @returns {{ lines: () => object[] }} the parsed lines, in the order written
 */
export const recordEcsLogLines = () => {
  const lines = []
  const ecsLogger = pino(
    { ...ecsFormatOptions, mixin: traceMixin, level: 'info' },
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
    spies = LEVELS.map((level) =>
      vi
        .spyOn(createLogger(), level)
        .mockImplementation((...args) => ecsLogger[level](...args))
    )
  })

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore())
  })

  return { lines: () => [...lines] }
}
