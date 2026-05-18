import { transportersController } from './controller.js'
import { transportersSelectController } from './select/controller.js'

export const transporter = {
  plugin: {
    name: 'transporter',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/transporters',
          ...transportersController.get
        },
        {
          method: 'GET',
          path: '/transporters/select',
          ...transportersSelectController.get
        },
        {
          method: 'POST',
          path: '/transporters',
          ...transportersController.post
        }
      ])
    }
  }
}
