import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'

import { createServer } from '../../server.js'
import { config } from '../../../config/config.js'
import { useRetryingKeepAliveAgentForWreck } from '../../../auth/wreck-agent.js'
import { createLogger } from './logging/logger.js'

async function startServer() {
  const connectAttemptPerAddressMs = 1000
  setDefaultAutoSelectFamilyAttemptTimeout(connectAttemptPerAddressMs)
  const logger = createLogger()
  if (config.get('httpProxy')) {
    logger.info(
      { keepAliveAgent: false, reason: 'httpProxy' },
      'HTTP proxy configured; Wreck keeps its own agent'
    )
  } else {
    useRetryingKeepAliveAgentForWreck(logger)
    logger.info(
      { keepAliveAgent: true },
      'Wreck plain-HTTP calls use the retrying keep-alive agent'
    )
  }

  const server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )

  return server
}

export { startServer }
