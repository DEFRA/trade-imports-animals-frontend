import { createDraft } from '../shared/store.js'
import {
  sections,
  applicableSections,
  hasOwnRoutes
} from '../shared/sections.js'
import { sectionHandlers } from '../shared/section-controller.js'
import { claimsRoutes } from '../shared/claims-routes.js'
import { addonsRoutes } from '../shared/addons-routes.js'
import { addonByValue, addonSequence } from '../shared/addons.js'
import { endingRoutes } from '../shared/endings.js'

const BASE = '/prototype/linear'
const LAYOUT = 'linear/layout.njk'
const open = { auth: false }

const sectionPath = (id, slug) => `${BASE}/${id}/${slug}`
const addonStepPath = (id, value, slug) =>
  `${BASE}/${id}/addons/${value}/${slug}`
const summaryPath = (id) => `${BASE}/${id}/quote-summary`

// Linear runs every selected add-on's steps as one flat sequence.
function seqIndex(quote, value, stepIndex) {
  const slug = addonByValue.get(value).steps[stepIndex].slug
  return addonSequence(quote).findIndex(
    (entry) => entry.value === value && entry.step.slug === slug
  )
}

// The live order skips conditional sections that don't apply to this quote, so
// answering "no" to claims jumps straight past the claims loop.
const liveOrder = (quote) => applicableSections(quote).map((s) => s.slug)

const makeHandlers = sectionHandlers({
  layout: LAYOUT,
  baseRedirect: BASE,
  backLinkFor(quote, section) {
    const order = liveOrder(quote)
    const index = order.indexOf(section.slug)
    return index <= 0 ? BASE : sectionPath(quote.id, order[index - 1])
  },
  onSaved(quote, section) {
    const order = liveOrder(quote)
    const next = order[order.indexOf(section.slug) + 1]
    return next
      ? sectionPath(quote.id, next)
      : `${BASE}/${quote.id}/quote-summary`
  }
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
            return h.redirect(sectionPath(draft.id, sections[0].slug))
          }
        },
        ...sectionRoutes(),
        ...claimsRoutes({
          basePath: BASE,
          layout: LAYOUT,
          claimsBack: (id) => sectionPath(id, 'driving-history'),
          afterClaims: (id) => sectionPath(id, 'cover-type')
        }),
        ...addonsRoutes({
          basePath: BASE,
          layout: LAYOUT,
          selectionBack: (id) => sectionPath(id, 'optional-extras'),
          afterSelection(quote) {
            const seq = addonSequence(quote)
            return seq.length
              ? addonStepPath(quote.id, seq[0].value, seq[0].step.slug)
              : summaryPath(quote.id)
          },
          stepBack(quote, value, stepIndex) {
            const seq = addonSequence(quote)
            const prev = seq[seqIndex(quote, value, stepIndex) - 1]
            return prev
              ? addonStepPath(quote.id, prev.value, prev.step.slug)
              : sectionPath(quote.id, 'addons')
          },
          afterStep(quote, value, stepIndex) {
            const seq = addonSequence(quote)
            const next = seq[seqIndex(quote, value, stepIndex) + 1]
            return next
              ? addonStepPath(quote.id, next.value, next.step.slug)
              : summaryPath(quote.id)
          }
        }),
        ...endingRoutes({
          basePath: BASE,
          layout: LAYOUT,
          // Last section (optional-extras) always applies, so this is stable.
          summaryBackPath: (id) =>
            sectionPath(id, sections[sections.length - 1].slug)
        })
      ])
    }
  }
}
