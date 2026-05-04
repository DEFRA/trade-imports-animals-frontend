import { authController } from '../auth/controller.js'

export const signoutController = {
  handler: async (request, h) => {
    return authController.signoutOidc.handler(request, h)
  }
}
