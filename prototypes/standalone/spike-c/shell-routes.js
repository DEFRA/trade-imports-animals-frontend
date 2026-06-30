import { createDraft, findQuote } from './lib/store.js'
import { BASE, TEMPLATES } from './journey/config.js'
import { hubPath } from './journey/paths.js'
import { hubViewModel } from './journey/hub-view.js'

/**
 * The journey's two shell pages: the start page and the hub (task list). Posting
 * the start page creates a draft quote and redirects to its hub; the hub renders
 * the task-list view model for a stored quote.
 */

const PAGE_TITLE = 'Get a car insurance quote'

/** The start page and the hub (task list) — the journey's two shell pages. */
export function shellRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: BASE,
      options: open,
      handler(_request, toolkit) {
        return toolkit.view(`${TEMPLATES}/start`, {
          pageTitle: PAGE_TITLE,
          startAction: `${BASE}/start`
        })
      }
    },
    {
      method: 'POST',
      path: `${BASE}/start`,
      options: open,
      handler(_request, toolkit) {
        const draft = createDraft('spike-c')
        return toolkit.redirect(hubPath(draft.id))
      }
    },
    {
      method: 'GET',
      path: `${BASE}/{id}`,
      options: open,
      handler(request, toolkit) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return toolkit.redirect(BASE)
        }
        return toolkit.view(`${TEMPLATES}/hub`, {
          pageTitle: PAGE_TITLE,
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
