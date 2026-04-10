import { additionalDetailsController } from './controller.js'

export const additionalDetails = {
  plugin: {
    name: 'additional-details',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/additional-details',
          ...additionalDetailsController.get
        },
        {
          method: 'POST',
          path: '/additional-details',
          ...additionalDetailsController.post
        }
      ])
    }
  }
}
