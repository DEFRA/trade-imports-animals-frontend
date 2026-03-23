import { authController } from '../auth/controller.js'

export const signoutController = {
  handler: async function (request, h) {
    return authController.signoutOidc.handler(request, h)
  }
}
