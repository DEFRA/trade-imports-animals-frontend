import { declarationController } from './controller.js'

export const declaration = {
  plugin: {
    name: 'declaration',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/declaration',
          ...declarationController.get
        },
        {
          method: 'POST',
          path: '/declaration',
          ...declarationController.post
        }
      ])
    }
  }
}
