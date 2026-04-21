import { consignorAddressSelectController } from './controller.js'

export const consignorAddressSelect = {
  plugin: {
    name: 'consignorAddressSelect',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address/select',
          ...consignorAddressSelectController.get
        }
      ])
    }
  }
}
