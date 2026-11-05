import { config } from '../../../config/config.js'
import { createServer } from '../../server.js'

export const startStubModeServer = async () => {
  const originalStubMode = config.get('stubMode')
  config.set('stubMode', true)
  const server = await createServer()
  await server.initialize()
  return {
    server,
    stop: async () => {
      config.set('stubMode', originalStubMode)
      await server.stop({ timeout: 0 })
    }
  }
}
