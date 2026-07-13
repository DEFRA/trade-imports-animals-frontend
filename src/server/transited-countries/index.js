import { transitedCountriesController } from './controller.js'

export const transitedCountries = {
  plugin: {
    name: 'transited-countries',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/transited-countries',
          ...transitedCountriesController.get
        },
        {
          method: 'POST',
          path: '/transited-countries',
          ...transitedCountriesController.post
        },
        {
          method: 'POST',
          path: '/transited-countries/remove',
          ...transitedCountriesController.remove
        }
      ])
    }
  }
}
