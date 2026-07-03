import { evaluate, hubViewModel, modelJson } from '../contract/index.js'
import {
  BASE,
  currentJourney,
  hubPath,
  startJourney,
  startPath,
  TEMPLATES
} from '../journey/index.js'

/**
 * The journey's two shell pages: the start page and the hub (task list).
 * Everything else is a generic presents page or a loop/ending owning its
 * own routes; these two bookend the flow — line-for-line diffable against
 * spike-a/routes/shell.js. All copy passes through from model/flow.json.
 */

const flow = JSON.parse(modelJson().flow)

const options = (surface, pageId = null) => ({
  auth: false,
  app: { surface, pageId }
})

/** The start page and the hub (task list) — the journey's two shell pages. */
export const shellRoutes = () => [
  {
    method: 'GET',
    path: BASE,
    options: options('start'),
    handler: (_request, responseToolkit) =>
      responseToolkit.view(`${TEMPLATES}/start`, {
        pageTitle: flow.start.heading,
        start: flow.start,
        startAction: startPath()
      })
  },
  {
    method: 'POST',
    path: startPath(),
    options: options('start'),
    handler: (_request, responseToolkit) => {
      startJourney(responseToolkit)
      return responseToolkit.redirect(hubPath())
    }
  },
  {
    method: 'GET',
    path: hubPath(),
    options: options('hub'),
    handler: (request, responseToolkit) => {
      const journey = currentJourney(request, responseToolkit)
      const viewModel = hubViewModel(evaluate(journey))
      return responseToolkit.view(`${TEMPLATES}/hub`, {
        pageTitle: viewModel.heading,
        ...viewModel,
        breadcrumbs: [
          { text: 'Prototypes', href: '/prototype-standalone' },
          { text: 'Obligations (standalone)', href: BASE },
          { text: 'Your application' }
        ]
      })
    }
  }
]
