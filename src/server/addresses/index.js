import { addressesController } from './controller.js'
import { consignorsSelectController } from './consignors/select/controller.js'
import { destinationsSelectController } from './destinations/select/controller.js'
import { consignmentContactSelectController } from './consignment/contact/select/controller.js'
import { placeOfOriginSelectController } from './place-of-origin/select/controller.js'
import { consigneesSelectController } from './consignees/select/controller.js'
import { importersSelectController } from './importers/select/controller.js'

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
          method: 'GET',
          path: '/consignment/contact/select',
          ...consignmentContactSelectController.get
        },
        {
          method: 'GET',
          path: '/place-of-origin/select',
          ...placeOfOriginSelectController.get
        },
        {
          method: 'POST',
          path: '/place-of-origin/select',
          ...placeOfOriginSelectController.post
        },
        {
          method: 'GET',
          path: '/consignees/select',
          ...consigneesSelectController.get
        },
        {
          method: 'POST',
          path: '/consignees/select',
          ...consigneesSelectController.post
        },
        {
          method: 'GET',
          path: '/importers/select',
          ...importersSelectController.get
        },
        {
          method: 'POST',
          path: '/importers/select',
          ...importersSelectController.post
        },
        {
          method: 'POST',
          path: '/addresses',
          ...addressesController.post
        },
        {
          method: 'POST',
          path: '/consignment/contact/select',
          ...consignmentContactSelectController.post
        }
      ])
    }
  }
}
