import { healthController } from './controller.js'

export const health = {
  plugin: {
    name: 'health',
    register(server) {
      server.route({
        method: 'GET',
        path: '/health',
        // Platform health checks must not require an authenticated session
        options: { auth: false },
        ...healthController
      })
    }
  }
}
