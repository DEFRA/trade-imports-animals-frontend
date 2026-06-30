import { createDraft, findQuote } from '../lib/store.js'
import { hubViewModel } from '../journey/hub-view-model.js'
import { BASE, hubPath } from '../journey/config.js'

/**
 * The journey's two shell pages: the start page and the hub (task list).
 * Everything else is a generic section page or a loop/fan-out owning its own
 * routes; these two bookend the flow.
 */

const TEMPLATES = 'standalone/spike-a/templates'

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
        const draft = createDraft('spike-a')
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
            { text: 'Spike A (standalone)', href: BASE },
            { text: 'Your application' }
          ]
        })
      }
    }
  ]
}
