import { transporterController } from './controller.js'
import { transporterSelectController } from './select/controller.js'

export const transporter = {
  plugin: {
    name: 'transporter',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/transporter',
          ...transporterController.get
        },
        {
          method: 'GET',
          path: '/transporter/select',
          ...transporterSelectController.get
        },
        {
          method: 'POST',
          path: '/transporter',
          ...transporterController.post
        }
      ])
    }
  }
}
