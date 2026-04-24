import { addressesController } from './controller.js'
import { consignorsSelectController } from './consignors/select/controller.js'
import { destinationsSelectController } from './destinations/select/controller.js'

export const addresses = {
  plugin: {
    name: 'consignorAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/addresses',
          ...addressesController.get
        },
        {
          method: 'GET',
          path: '/consignors/select',
          ...consignorsSelectController.get
        },
        {
          method: 'GET',
          path: '/destinations/select',
          ...destinationsSelectController.get
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
