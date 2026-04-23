import { consignorsSelectController } from './controller.js'

export const consignorsSelect = {
  plugin: {
    name: 'consignorSelect',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/addresses/consignors/select',
          ...consignorsSelectController.get
        }
      ])
    }
  }
}
