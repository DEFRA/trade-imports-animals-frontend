import { consignorAddressController } from './controller.js'
import { consignorAddressSelectController } from './select/controller.js'

export const consignorAddress = {
  plugin: {
    name: 'consignorAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/consignor/address',
          ...consignorAddressController.get
        },
        {
          method: 'GET',
          path: '/consignor/address/select',
          ...consignorAddressSelectController.get
        },
        {
          method: 'POST',
          path: '/consignor/address',
          ...consignorAddressController.post
        }
      ])
    }
  }
}
