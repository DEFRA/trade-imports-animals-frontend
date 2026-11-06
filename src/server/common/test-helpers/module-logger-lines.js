import { afterEach, beforeEach, vi } from 'vitest'

import { createLogger } from '../helpers/logging/logger.js'

/**
 * Records the info lines the module-level logger writes during each test of the
 * enclosing `describe`, and restores the logger afterwards.
 *
 * @returns {{ entriesWith: (message: string) => Array<{ fields: object, message: string }> }}
 */
export const recordModuleLoggerInfo = () => {
  const entries = []
  let infoSpy

  beforeEach(() => {
    entries.length = 0
    infoSpy = vi
      .spyOn(createLogger(), 'info')
      .mockImplementation((fields, message) => {
        entries.push({ fields, message })
      })
  })

  afterEach(() => {
    infoSpy.mockRestore()
  })

  return {
    entriesWith: (message) =>
      entries.filter((entry) => entry.message === message)
  }
}
