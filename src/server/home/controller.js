import { resetSession } from '../common/helpers/session-helpers.js'

/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 */
export const homeController = {
  handler(_request, h) {
    return h.view('home/index', {
      pageTitle: 'Import notification service',
      heading: 'Import notification service'
    })
  }
}

/**
 * Controller for starting a new import notification journey.
 * Clears the entire session to ensure no cached data from previous journeys.
 */
export const startJourneyController = {
  handler(_request, h) {
    // Reset the entire session - clears all keys and assigns new session ID
    resetSession(_request)
    return h.redirect('/origin')
  }
}
