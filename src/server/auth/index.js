import { authController } from './controller.js'

export const authRoutes = {
  plugin: {
    name: 'auth-routes',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/auth/sign-in',
          options: {
            auth: 'defra-id'
          },
          ...authController.signin
        },
        {
          method: 'GET',
          path: '/auth/sign-in-oidc',
          options: {
            auth: { strategy: 'defra-id', mode: 'try' }
          },
          ...authController.signinOidc
        },
        {
          method: 'GET',
          path: '/auth/sign-out',
          options: {
            auth: { mode: 'try' }
          },
          ...authController.signout
        },
        {
          method: 'GET',
          path: '/auth/sign-out-oidc',
          options: {
            auth: { mode: 'try' }
          },
          ...authController.signoutOidc
        },
        {
          method: 'GET',
          path: '/auth/organisation',
          options: {
            auth: 'defra-id'
          },
          ...authController.organisation
        }
      ])
    }
  }
}
