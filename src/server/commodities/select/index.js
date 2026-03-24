import { commoditiesSelectController } from './controller.js'

export const commoditiesSelect = {
  plugin: {
    name: 'commodity-select',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/commodities/select',
          ...commoditiesSelectController.get
        },
        {
          method: 'POST',
          path: '/commodities/select',
          ...commoditiesSelectController.post
        }
      ])
    }
  }
}
