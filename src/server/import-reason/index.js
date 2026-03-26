import { importReasonController } from './controller.js'

export const importReason = {
  plugin: {
    name: 'import-reason',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/import-reason',
          ...importReasonController.get
        },
        {
          method: 'POST',
          path: '/import-reason',
          ...importReasonController.post
        }
      ])
    }
  }
}
