import { afterEach } from 'vitest'

import { config } from '../../../config/config.js'

export const restoreConfigAfterEach = (keys) => {
  const originalValues = Object.fromEntries(
    keys.map((key) => [key, config.get(key)])
  )
  afterEach(() => {
    for (const key of keys) {
      config.set(key, originalValues[key])
    }
  })
}
