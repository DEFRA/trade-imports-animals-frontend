import { createDraft, findQuote } from '../lib/store.js'
import { BASE, TEMPLATES } from './config.js'
import { hubPath } from './links.js'
import { hubViewModel } from './hub.js'

/**
 * Journey shell barrel — re-exports the config, link helpers and add-on map
 * other modules import from `journey` today, and owns the two shell routes (the
 * start page and the hub/task list). Everything the journey needs is reachable
 * from here, so you can read the journey end to end without leaving spike-b/.
 */

export { BASE, LAYOUT, grouped } from './config.js'
export {
  hubPath,
  addonStepPath,
  breadcrumbs,
  pathForStep,
  resolveNav,
  navBack,
  navNext
} from './links.js'
export { addonByValue } from '../lib/addons/index.js'

const PAGE_TITLE = 'Get a car insurance quote'
const JOURNEY_KEY = 'spike-b'

const hubBreadcrumbs = [
  { text: 'Prototypes', href: '/prototype-standalone' },
  { text: 'Spike B (standalone)', href: BASE },
  { text: 'Your application' }
]

const startPageHandler = (_request, responseToolkit) =>
  responseToolkit.view(`${TEMPLATES}/start`, {
    pageTitle: PAGE_TITLE,
    startAction: `${BASE}/start`
  })

const startSubmitHandler = (_request, responseToolkit) =>
  responseToolkit.redirect(hubPath(createDraft(JOURNEY_KEY).id))

const hubPageHandler = (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return responseToolkit.view(`${TEMPLATES}/hub`, {
    pageTitle: PAGE_TITLE,
    ...hubViewModel(quote),
    breadcrumbs: hubBreadcrumbs
  })
}

/** The start page and the hub (task list) — the journey's two shell pages. */
export function shellRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: BASE,
      options: open,
      handler: startPageHandler
    },
    {
      method: 'POST',
      path: `${BASE}/start`,
      options: open,
      handler: startSubmitHandler
    },
    {
      method: 'GET',
      path: `${BASE}/{id}`,
      options: open,
      handler: hubPageHandler
    }
  ]
}
