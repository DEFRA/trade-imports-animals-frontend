import { BASE, hubPath, startPath, TEMPLATES } from '../../config.js'
import { startJourney } from '../../engine/journey.js'
import { open } from '../../shared/kit.js'

/**
 * The start page (mounted at BASE — the grouped path the specs walk) and
 * its POST that mints a fresh journey and redirects to the hub. Copy is
 * authored here, next to the page.
 */
const view = `${TEMPLATES}/features/start/template`

export const routes = [
  {
    method: 'GET',
    path: BASE,
    options: open,
    handler: (_request, h) =>
      h.view(view, {
        pageTitle: 'Get a car insurance quote',
        heading: 'Get a car insurance quote',
        body:
          'The application is grouped into a few tasks. Each task takes you ' +
          'through a short set of questions, then returns you to this list.',
        buttonText: 'Start now',
        startAction: startPath()
      })
  },
  {
    method: 'POST',
    path: startPath(),
    options: open,
    handler: (request, h) => {
      startJourney(request, h)
      return h.redirect(hubPath())
    }
  }
]
