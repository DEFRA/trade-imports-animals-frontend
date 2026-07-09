import { BASE, hubPath, pagePath, startPath, TEMPLATES } from '../../config.js'
import { startJourney } from '../../engine/journey.js'
import { open } from '../../shared/kit.js'
import { dashboardPage as page } from './page.js'

const view = `${TEMPLATES}/features/dashboard/template`

export const routes = [
  {
    method: 'GET',
    path: pagePath(page.slug),
    options: open,
    handler: (_request, h) =>
      h.view(view, {
        pageTitle: 'Import notification service',
        heading: 'Import notification service',
        body:
          'Use this service to tell the authorities about live animals ' +
          'you are importing. You will answer a short set of questions ' +
          'about the consignment, then submit your notification.',
        buttonText: 'Start a new notification',
        startAction: startPath()
      })
  },
  {
    method: 'GET',
    path: BASE,
    options: open,
    handler: (_request, h) => h.redirect(pagePath(page.slug))
  },
  {
    method: 'POST',
    path: startPath(),
    options: open,
    handler: async (request, h) => {
      await startJourney(request, h)
      return h.redirect(hubPath())
    }
  }
]
