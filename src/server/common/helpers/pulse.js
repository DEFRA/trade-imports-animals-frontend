import hapiPulse from 'hapi-pulse'

import { createLogger } from './logging/logger.js'

const shutdownTimeoutMs = 10000

const pulse = {
  plugin: hapiPulse,
  options: {
    logger: createLogger(),
    timeout: shutdownTimeoutMs
  }
}

export { pulse }
