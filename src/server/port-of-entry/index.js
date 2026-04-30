import { portOfEntryController } from './controller.js'

export const portOfEntry = {
  plugin: {
    name: 'port-of-entry',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/port-of-entry',
          ...portOfEntryController.get
        },
        {
          method: 'POST',
          path: '/port-of-entry',
          ...portOfEntryController.post
        }
      ])
    }
  }
}
