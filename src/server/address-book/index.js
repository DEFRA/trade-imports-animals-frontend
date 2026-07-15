import { addressBookListController } from './list/controller.js'

export const addressBook = {
  plugin: {
    name: 'address-book',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-book',
          ...addressBookListController
        }
      ])
    }
  }
}
