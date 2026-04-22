import { addressesController } from './controller.js'
import { consignorSelectController } from './consignor/select/controller.js'

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
          path: '/consignor/select',
          ...consignorSelectController.get
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
