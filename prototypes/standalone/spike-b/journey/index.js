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

/** The start page and the hub (task list) — the journey's two shell pages. */
export function shellRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: BASE,
      options: open,
      handler(_request, h) {
        return h.view(`${TEMPLATES}/start`, {
          pageTitle: 'Get a car insurance quote',
          startAction: `${BASE}/start`
        })
      }
    },
    {
      method: 'POST',
      path: `${BASE}/start`,
      options: open,
      handler(_request, h) {
        const draft = createDraft('spike-b')
        return h.redirect(hubPath(draft.id))
      }
    },
    {
      method: 'GET',
      path: `${BASE}/{id}`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        return h.view(`${TEMPLATES}/hub`, {
          pageTitle: 'Get a car insurance quote',
          ...hubViewModel(quote),
          breadcrumbs: [
            { text: 'Prototypes', href: '/prototype-standalone' },
            { text: 'Spike B (standalone)', href: BASE },
            { text: 'Your application' }
          ]
        })
      }
    }
  ]
}
