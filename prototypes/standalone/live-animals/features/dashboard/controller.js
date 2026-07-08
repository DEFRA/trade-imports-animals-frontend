import { BASE, hubPath, pagePath, startPath, TEMPLATES } from '../../config.js'
import { startJourney } from '../../engine/journey.js'
import { open } from '../../shared/kit.js'
import { dashboardPage as page } from './page.js'

const view = `${TEMPLATES}/features/dashboard/template`

/**
 * Entry dashboard for the live-animals journey and the journey-start seam.
 * Collects nothing, so there is no obligations file and no dispatch
 * registration. It owns three routes:
 * - GET `${BASE}/home` renders the landing page.
 * - GET `${BASE}` (the breadcrumb target) redirects to the landing page, so
 *   the service root always lands on the dashboard.
 * - POST `${BASE}/start` resets the session and hands over to the task list —
 *   the target of the landing page's start button.
 */
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
    handler: (request, h) => {
      startJourney(request, h)
      return h.redirect(hubPath())
    }
  }
]
