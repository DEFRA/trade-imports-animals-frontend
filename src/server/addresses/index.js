import { addressesController } from './controller.js'

export const addresses = {
  plugin: {
    name: 'addresses',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/addresses',
          ...addressesController.get
        },
        {
          method: 'POST',
          path: '/addresses',
          ...addressesController.post
        }
      ])
    }
  }
}
