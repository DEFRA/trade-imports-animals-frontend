import { createDraft, findQuote } from '../shared/store.js'
import { sections, allSectionsComplete } from '../shared/sections.js'
import { sectionHandlers } from '../shared/section-controller.js'
import { endingRoutes } from '../shared/endings.js'

const BASE = '/prototype/task-list'
const LAYOUT = 'task-list/layout.njk'
const open = { auth: false }

const hubPath = (id) => `${BASE}/${id}`
const sectionPath = (id, slug) => `${BASE}/${id}/${slug}`

function hubItems(quote) {
  const items = sections.map((section) => ({
    title: { text: section.title },
    href: sectionPath(quote.id, section.slug),
    status: section.isComplete(quote)
      ? { text: 'Completed' }
      : { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
  }))

  const ready = allSectionsComplete(quote)
  items.push({
    title: { text: 'Get your quote' },
    href: ready ? `${BASE}/${quote.id}/quote-summary` : undefined,
    status: ready
      ? { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
      : {
          text: 'Cannot start yet',
          classes: 'govuk-task-list__status--cannot-start-yet'
        }
  })

  return items
}

// Sections save and return to the task list hub.
const makeHandlers = sectionHandlers({
  layout: LAYOUT,
  baseRedirect: BASE,
  backLinkFor: (quote) => hubPath(quote.id),
  onSaved: (quote) => hubPath(quote.id)
})

function sectionRoutes() {
  return sections.flatMap((section) => {
    const handlers = makeHandlers(section)
    return [
      {
        method: 'GET',
        path: sectionPath('{id}', section.slug),
        options: open,
        ...handlers.get
      },
      {
        method: 'POST',
        path: sectionPath('{id}', section.slug),
        options: open,
        ...handlers.post
      }
    ]
  })
}

/**
 * Task list car insurance prototype — a hub page lists every section with its
 * status; you complete them in any order, then get your quote.
 */
export const taskListPrototype = {
  plugin: {
    name: 'prototype-task-list',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: BASE,
          options: open,
          handler(_request, h) {
            return h.view('task-list/start', {
              pageTitle: 'Get a car insurance quote'
            })
          }
        },
        {
          method: 'POST',
          path: `${BASE}/start`,
          options: open,
          handler(_request, h) {
            const draft = createDraft('task-list')
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
            const completedCount = sections.filter((section) =>
              section.isComplete(quote)
            ).length
            return h.view('task-list/hub', {
              pageTitle: 'Get a car insurance quote',
              items: hubItems(quote),
              completedCount,
              totalCount: sections.length
            })
          }
        },
        ...sectionRoutes(),
        ...endingRoutes({
          basePath: BASE,
          layout: LAYOUT,
          summaryBackPath: (id) => hubPath(id)
        })
      ])
    }
  }
}
