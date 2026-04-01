import { commodityDetailsController } from './controller.js'

export const commodityDetails = {
  plugin: {
    name: 'commodity-details',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/commodities/details',
          ...commodityDetailsController.get
        },
        {
          method: 'POST',
          path: '/commodities/details',
          ...commodityDetailsController.post
        }
      ])
    }
  }
}
