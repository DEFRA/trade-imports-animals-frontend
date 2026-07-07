import { pagePath, startPath, TEMPLATES } from '../../config.js'
import { open } from '../../shared/kit.js'
import { dashboardPage as page } from './page.js'

const view = `${TEMPLATES}/features/dashboard/template`

/**
 * Entry dashboard for the live-animals journey. Collects nothing, so there
 * is no obligations file, no dispatch registration and no POST of its own —
 * the start button posts to the existing journey-start route, which resets
 * the session and hands over to the task list.
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
  }
]
