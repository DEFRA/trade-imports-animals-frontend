import process from 'node:process'

import { startServer } from './server/common/helpers/start-server.js'
import { createLogger } from './server/common/helpers/logging/logger.js'

const logger = createLogger()

process.on('unhandledRejection', (error) => {
  logger.error({ err: error }, 'Unhandled rejection')
  process.exitCode = 1
})

try {
  await startServer()
} catch (error) {
  logger.error({ err: error }, 'Server failed to start')
  process.exit(1)
}
