import { createDraft, findQuote } from '../shared/store.js'
import {
  sections,
  sectionBySlug,
  applies,
  hasOwnRoutes,
  allSectionsComplete
} from '../shared/sections.js'
import { sectionHandlers } from '../shared/section-controller.js'
import { claimsRoutes } from '../shared/claims-routes.js'
import { addonsRoutes } from '../shared/addons-routes.js'
import { addonByValue, addonHubItems } from '../shared/addons.js'
import { endingRoutes } from '../shared/endings.js'

const BASE = '/prototype/task-list-with-linear-tasks'
const LAYOUT = 'task-list-with-linear-tasks/layout.njk'
const open = { auth: false }

const hubPath = (id) => `${BASE}/${id}`
const sectionPath = (id, slug) => `${BASE}/${id}/${slug}`
const addonStepPath = (id, value, slug) =>
  `${BASE}/${id}/addons/${value}/${slug}`

// Every page links back to the per-quote hub, so the user can jump sideways out
// of any task or sub-task without walking back through the journey.
const breadcrumbs = (quote, title) => [
  { text: 'Prototypes', href: '/prototype' },
  { text: 'Task list with linear tasks', href: BASE },
  { text: 'Your application', href: hubPath(quote.id) },
  { text: title }
]

// Each task is a short linear run through a group of sections. The claims loop
// is conditional, so it only forms part of the driving task when it applies.
const groups = [
  {
    title: 'About you and your vehicle',
    sectionSlugs: ['about-you', 'your-vehicle']
  },
  {
    title: 'Your driving and cover',
    sectionSlugs: ['driving-history', 'claims', 'cover-type', 'optional-extras']
  }
]

/** The group's sections that currently apply, in order. */
function liveGroupSlugs(group, quote) {
  return group.sectionSlugs.filter((slug) =>
    applies(sectionBySlug.get(slug), quote)
  )
}

function locate(slug) {
  for (const group of groups) {
    if (group.sectionSlugs.includes(slug)) {
      return { group }
    }
  }
  return null
}

function groupStatus(group, quote) {
  const live = liveGroupSlugs(group, quote).map((slug) =>
    sectionBySlug.get(slug)
  )
  if (live.every((section) => section.isComplete(quote))) {
    return { text: 'Completed' }
  }
  if (live.some((section) => section.isComplete(quote))) {
    return { tag: { text: 'In progress', classes: 'govuk-tag--light-blue' } }
  }
  return { tag: { text: 'Not started', classes: 'govuk-tag--grey' } }
}

function hubItems(quote) {
  const items = groups.map((group) => ({
    title: { text: group.title },
    hint: {
      text: liveGroupSlugs(group, quote)
        .map((slug) => sectionBySlug.get(slug).title)
        .join(', ')
    },
    href: sectionPath(quote.id, group.sectionSlugs[0]),
    status: groupStatus(group, quote)
  }))

  // Add-ons: a selection task, then one independent task per chosen add-on.
  const addonsSection = sectionBySlug.get('addons')
  items.push({
    title: { text: addonsSection.title },
    href: `${BASE}/${quote.id}/addons`,
    status: addonsSection.isComplete(quote)
      ? { text: 'Completed' }
      : { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
  })
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

// Within a task, sections run linearly; the last one returns to the hub.
const makeHandlers = sectionHandlers({
  layout: LAYOUT,
  baseRedirect: BASE,
  backLinkFor(quote, section) {
    const { group } = locate(section.slug)
    const live = liveGroupSlugs(group, quote)
    const idx = live.indexOf(section.slug)
    return idx <= 0 ? hubPath(quote.id) : sectionPath(quote.id, live[idx - 1])
  },
  onSaved(quote, section) {
    const { group } = locate(section.slug)
    const live = liveGroupSlugs(group, quote)
    const next = live[live.indexOf(section.slug) + 1]
    return next ? sectionPath(quote.id, next) : hubPath(quote.id)
  },
  breadcrumbs
})

// The email gate lives outside the task groups: no group navigation, no hub
// breadcrumb (the user can't reach the hub yet). After save it routes to the
// hub; `?change=1` (from CYA) is handled by sectionHandlers, returning to CYA.
const emailHandlers = sectionHandlers({
  layout: LAYOUT,
  baseRedirect: BASE,
  backLinkFor: () => BASE,
  onSaved: (quote) => hubPath(quote.id),
  breadcrumbs: (_quote, title) => [
    { text: 'Prototypes', href: '/prototype' },
    { text: 'Task list with linear tasks', href: BASE },
    { text: title }
  ]
})(sectionBySlug.get('email'))

function emailRoutes() {
  return [
    {
      method: 'GET',
      path: sectionPath('{id}', 'email'),
      options: open,
      ...emailHandlers.get
    },
    {
      method: 'POST',
      path: sectionPath('{id}', 'email'),
      options: open,
      ...emailHandlers.post
    }
  ]
}

function sectionRoutes() {
  // Loops and subtask fan-outs own their routes, not the generic section page.
  // The email gate also owns its own routes (registered separately, below).
  return sections
    .filter((section) => !hasOwnRoutes(section) && !section.preHub)
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
            // Send the user to the pre-hub email gate, not straight to the hub.
            return h.redirect(sectionPath(draft.id, 'email'))
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
            // Pre-hub gate: the hub is unreachable until the user has given us
            // an email address. Anyone deep-linking here gets sent to /email.
            if (!quote.email) {
              return h.redirect(sectionPath(quote.id, 'email'))
            }
            const completedCount = groups.filter((group) =>
              liveGroupSlugs(group, quote).every((slug) =>
                sectionBySlug.get(slug).isComplete(quote)
              )
            ).length
            return h.view('task-list-with-linear-tasks/hub', {
              pageTitle: 'Get a car insurance quote',
              items: hubItems(quote),
              completedCount,
              totalCount: groups.length,
              breadcrumbs: [
                { text: 'Prototypes', href: '/prototype' },
                { text: 'Task list with linear tasks', href: BASE },
                { text: 'Your application' }
              ]
            })
          }
        },
        ...emailRoutes(),
        ...sectionRoutes(),
        ...claimsRoutes({
          basePath: BASE,
          layout: LAYOUT,
          // The loop sits inside the driving task's linear run.
          claimsBack: (id) => sectionPath(id, 'driving-history'),
          afterClaims: (id) => sectionPath(id, 'cover-type'),
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
