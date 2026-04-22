import { consignorSelectController } from './controller.js'

export const consignorSelect = {
  plugin: {
    name: 'consignorSelect',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/addresses/consignor/select',
          ...consignorSelectController.get
        }
      ])
    }
  }
}
