import { createDraft } from '../shared/store.js'
import { sections } from '../shared/sections.js'
import { sectionHandlers } from '../shared/section-controller.js'
import { endingRoutes } from '../shared/endings.js'

const BASE = '/prototype/linear'
const LAYOUT = 'linear/layout.njk'
const open = { auth: false }

const order = sections.map((section) => section.slug)
const sectionPath = (id, slug) => `${BASE}/${id}/${slug}`

const makeHandlers = sectionHandlers({
  layout: LAYOUT,
  baseRedirect: BASE,
  backLinkFor(quote, section) {
    const index = order.indexOf(section.slug)
    return index <= 0 ? BASE : sectionPath(quote.id, order[index - 1])
  },
  onSaved(quote, section) {
    const next = order[order.indexOf(section.slug) + 1]
    return next
      ? sectionPath(quote.id, next)
      : `${BASE}/${quote.id}/quote-summary`
  }
})

function sectionRoutes() {
  return sections.flatMap((section) => {
    const handlers = makeHandlers(section)
    return [
      {
        method: 'GET',
        path: `${BASE}/{id}/${section.slug}`,
        options: open,
        ...handlers.get
      },
      {
        method: 'POST',
        path: `${BASE}/{id}/${section.slug}`,
        options: open,
        ...handlers.post
      }
    ]
  })
}

/**
 * Linear car insurance prototype — one page per question, chained with
 * "Save and continue". Registered only when prototypes are enabled.
 */
export const linearPrototype = {
  plugin: {
    name: 'prototype-linear',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: BASE,
          options: open,
          handler(_request, h) {
            return h.view('linear/start', {
              pageTitle: 'Get a car insurance quote'
            })
          }
        },
        {
          method: 'POST',
          path: `${BASE}/start`,
          options: open,
          handler(_request, h) {
            const draft = createDraft('linear')
            return h.redirect(sectionPath(draft.id, order[0]))
          }
        },
        ...sectionRoutes(),
        ...endingRoutes({
          basePath: BASE,
          layout: LAYOUT,
          summaryBackPath: (id) => sectionPath(id, order[order.length - 1])
        })
      ])
    }
  }
}
