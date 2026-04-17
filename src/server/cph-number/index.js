import { cphNumberController } from './controller.js'

export const cphNumber = {
  plugin: {
    name: 'cph-number',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/cph-number',
          ...cphNumberController.get
        },
        {
          method: 'POST',
          path: '/cph-number',
          ...cphNumberController.post
        }
      ])
    }
  }
}
