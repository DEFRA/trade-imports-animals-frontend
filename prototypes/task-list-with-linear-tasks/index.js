import { createDraft, findQuote } from '../shared/store.js'
import {
  sections,
  sectionBySlug,
  allSectionsComplete
} from '../shared/sections.js'
import { sectionHandlers } from '../shared/section-controller.js'
import { endingRoutes } from '../shared/endings.js'

const BASE = '/prototype/task-list-with-linear-tasks'
const LAYOUT = 'task-list-with-linear-tasks/layout.njk'
const open = { auth: false }

const hubPath = (id) => `${BASE}/${id}`
const sectionPath = (id, slug) => `${BASE}/${id}/${slug}`

// Each task is a short linear run through a group of sections.
const groups = [
  {
    title: 'About you and your vehicle',
    sectionSlugs: ['about-you', 'your-vehicle']
  },
  {
    title: 'Your driving and cover',
    sectionSlugs: ['driving-history', 'cover-type', 'optional-extras']
  }
]

function locate(slug) {
  for (const group of groups) {
    const idx = group.sectionSlugs.indexOf(slug)
    if (idx !== -1) {
      return { group, idx }
    }
  }
  return null
}

function groupStatus(group, quote) {
  const groupSections = group.sectionSlugs.map((slug) =>
    sectionBySlug.get(slug)
  )
  if (groupSections.every((section) => section.isComplete(quote))) {
    return { text: 'Completed' }
  }
  if (groupSections.some((section) => section.isComplete(quote))) {
    return { tag: { text: 'In progress', classes: 'govuk-tag--light-blue' } }
  }
  return { tag: { text: 'Not started', classes: 'govuk-tag--grey' } }
}

function hubItems(quote) {
  const items = groups.map((group) => ({
    title: { text: group.title },
    hint: {
      text: group.sectionSlugs
        .map((slug) => sectionBySlug.get(slug).title)
        .join(', ')
    },
    href: sectionPath(quote.id, group.sectionSlugs[0]),
    status: groupStatus(group, quote)
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

// Within a task, sections run linearly; the last one returns to the hub.
const makeHandlers = sectionHandlers({
  layout: LAYOUT,
  baseRedirect: BASE,
  backLinkFor(quote, section) {
    const { group, idx } = locate(section.slug)
    return idx === 0
      ? hubPath(quote.id)
      : sectionPath(quote.id, group.sectionSlugs[idx - 1])
  },
  onSaved(quote, section) {
    const { group, idx } = locate(section.slug)
    const next = group.sectionSlugs[idx + 1]
    return next ? sectionPath(quote.id, next) : hubPath(quote.id)
  }
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
 * Task list where each task is itself a short linear journey through a group of
 * sections — a hybrid of the linear and task list patterns.
 */
export const taskListWithLinearTasksPrototype = {
  plugin: {
    name: 'prototype-task-list-with-linear-tasks',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: BASE,
          options: open,
          handler(_request, h) {
            return h.view('task-list-with-linear-tasks/start', {
              pageTitle: 'Get a car insurance quote'
            })
          }
        },
        {
          method: 'POST',
          path: `${BASE}/start`,
          options: open,
          handler(_request, h) {
            const draft = createDraft('task-list-with-linear-tasks')
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
            const completedCount = groups.filter((group) =>
              group.sectionSlugs.every((slug) =>
                sectionBySlug.get(slug).isComplete(quote)
              )
            ).length
            return h.view('task-list-with-linear-tasks/hub', {
              pageTitle: 'Get a car insurance quote',
              items: hubItems(quote),
              completedCount,
              totalCount: groups.length
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
