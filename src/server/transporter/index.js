import { transporterController } from './controller.js'

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
          method: 'POST',
          path: '/transporter',
          ...transporterController.post
        }
      ])
    }
  }
}
