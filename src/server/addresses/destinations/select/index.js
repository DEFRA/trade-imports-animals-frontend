import { destinationsSelectController } from './controller.js'

export const destinationsSelect = {
  plugin: {
    name: 'destination-select',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/addresses/destinations/select',
          ...destinationsSelectController.get
        }
      ])
    }
  }
}
