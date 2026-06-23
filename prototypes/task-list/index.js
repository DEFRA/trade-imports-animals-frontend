import { createDraft, findQuote } from '../shared/store.js'
import {
  sections,
  applicableSections,
  hasOwnRoutes,
  allSectionsComplete
} from '../shared/sections.js'
import { sectionHandlers } from '../shared/section-controller.js'
import { claimsRoutes } from '../shared/claims-routes.js'
import { addonsRoutes } from '../shared/addons-routes.js'
import { addonByValue, addonHubItems } from '../shared/addons.js'
import { endingRoutes } from '../shared/endings.js'

const BASE = '/prototype/task-list'
const LAYOUT = 'task-list/layout.njk'
const open = { auth: false }

const hubPath = (id) => `${BASE}/${id}`
const sectionPath = (id, slug) => `${BASE}/${id}/${slug}`
const addonStepPath = (id, value, slug) =>
  `${BASE}/${id}/addons/${value}/${slug}`

// Every page links back to the per-quote hub, so the user can jump sideways out
// of any task or sub-task without walking back through the journey.
const breadcrumbs = (quote, title) => [
  { text: 'Prototypes', href: '/prototype' },
  { text: 'Task list journey', href: BASE },
  { text: 'Your application', href: hubPath(quote.id) },
  { text: title }
]

function hubItems(quote) {
  // Conditional sections (e.g. claim details) only appear once they apply.
  const items = applicableSections(quote).map((section) => ({
    title: { text: section.title },
    href: sectionPath(quote.id, section.slug),
    status: section.isComplete(quote)
      ? { text: 'Completed' }
      : { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
  }))

  // Each chosen add-on becomes its own independent task.
  items.push(...addonHubItems(quote, addonStepPath))

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
  onSaved: (quote) => hubPath(quote.id),
  breadcrumbs
})

function sectionRoutes() {
  // Loops and subtask fan-outs own their routes, not the generic section page.
  return sections
    .filter((section) => !hasOwnRoutes(section))
    .flatMap((section) => {
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
            const live = applicableSections(quote)
            const completedCount = live.filter((section) =>
              section.isComplete(quote)
            ).length
            return h.view('task-list/hub', {
              pageTitle: 'Get a car insurance quote',
              items: hubItems(quote),
              completedCount,
              totalCount: live.length,
              breadcrumbs: [
                { text: 'Prototypes', href: '/prototype' },
                { text: 'Task list journey', href: BASE },
                { text: 'Your application' }
              ]
            })
          }
        },
        ...sectionRoutes(),
        ...claimsRoutes({
          basePath: BASE,
          layout: LAYOUT,
          claimsBack: (id) => hubPath(id),
          afterClaims: (id) => hubPath(id),
          breadcrumbs
        }),
        ...addonsRoutes({
          basePath: BASE,
          layout: LAYOUT,
          selectionBack: (id) => hubPath(id),
          afterSelection: (quote) => hubPath(quote.id),
          // Each add-on is its own task: steps run linearly, then back to the hub.
          stepBack: (quote, value, stepIndex) =>
            stepIndex === 0
              ? hubPath(quote.id)
              : addonStepPath(
                  quote.id,
                  value,
                  addonByValue.get(value).steps[stepIndex - 1].slug
                ),
          afterStep(quote, value, stepIndex) {
            const next = addonByValue.get(value).steps[stepIndex + 1]
            return next
              ? addonStepPath(quote.id, value, next.slug)
              : hubPath(quote.id)
          },
          breadcrumbs
        }),
        ...endingRoutes({
          basePath: BASE,
          layout: LAYOUT,
          summaryBackPath: (id) => hubPath(id),
          breadcrumbs
        })
      ])
    }
  }
}
