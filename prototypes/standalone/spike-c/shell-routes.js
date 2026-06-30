import { createDraft, findQuote } from './lib/store.js'
import { BASE, TEMPLATES } from './journey/config.js'
import { hubPath } from './journey/paths.js'
import { hubViewModel } from './journey/hub-view.js'

/**
 * The journey's two shell pages: the start page and the hub (task list). Posting
 * the start page creates a draft quote and redirects to its hub; the hub renders
 * the task-list view model for a stored quote.
 */

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
        const draft = createDraft('spike-c')
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
            { text: 'Spike C (standalone)', href: BASE },
            { text: 'Your application' }
          ]
        })
      }
    }
  ]
}
