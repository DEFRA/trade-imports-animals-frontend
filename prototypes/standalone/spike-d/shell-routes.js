import { createDraft, findQuote } from './lib/store.js'
import { BASE, hubPath } from './journey-shape.js'
import { hubViewModel } from './hub-view-model.js'

/** The start page and the hub (task list) — the journey's two shell pages. */

const TEMPLATES = 'standalone/spike-d/templates'
const open = { auth: false }

const hubBreadcrumbs = () => [
  { text: 'Prototypes', href: '/prototype-standalone' },
  { text: 'Spike D (standalone)', href: BASE },
  { text: 'Your application' }
]

const startHandler = (_request, responseToolkit) =>
  responseToolkit.view(`${TEMPLATES}/start`, {
    pageTitle: 'Get a car insurance quote',
    startAction: `${BASE}/start`
  })

const createDraftHandler = (_request, responseToolkit) => {
  const draft = createDraft('spike-d')
  return responseToolkit.redirect(hubPath(draft.id))
}

const hubHandler = (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return responseToolkit.view(`${TEMPLATES}/hub`, {
    pageTitle: 'Get a car insurance quote',
    ...hubViewModel(quote),
    breadcrumbs: hubBreadcrumbs()
  })
}

export function shellRoutes() {
  return [
    { method: 'GET', path: BASE, options: open, handler: startHandler },
    {
      method: 'POST',
      path: `${BASE}/start`,
      options: open,
      handler: createDraftHandler
    },
    {
      method: 'GET',
      path: `${BASE}/{id}`,
      options: open,
      handler: hubHandler
    }
  ]
}
