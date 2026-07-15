import { addressBookListController } from './list/controller.js'
import { addOperatorTypeController } from './add/type/controller.js'
import { addOperatorDetailsController } from './add/details/controller.js'

export const addressBook = {
  plugin: {
    name: 'address-book',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book',
          ...addressBookListController
        },
        {
          method: 'GET',
          path: '/address-book/add',
          ...addOperatorTypeController.get
        },
        {
          method: 'POST',
          path: '/address-book/add',
          ...addOperatorTypeController.post
        },
        {
          method: 'GET',
          path: '/address-book/add/details',
          ...addOperatorDetailsController.get
        },
        {
          method: 'POST',
          path: '/address-book/add/details',
          ...addOperatorDetailsController.post
        }
      ])
    }
  }
}
