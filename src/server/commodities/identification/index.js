import { animalIdentificationDetailsController } from './controller.js'

export const animalsIdentificationDetails = {
  plugin: {
    name: 'animals-identification-details',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/commodities/identification',
          ...animalIdentificationDetailsController.get
        },
        {
          method: 'POST',
          path: '/commodities/identification',
          ...animalIdentificationDetailsController.post
        }
      ])
    }
  }
}
