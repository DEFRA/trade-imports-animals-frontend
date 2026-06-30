import { findQuote, updateQuote } from './lib/store.js'
import { contract } from './runtime/contract/index.js'
import {
  BASE,
  LAYOUT,
  breadcrumbs,
  resolveNav,
  grouped
} from './journey/index.js'

/**
 * The generic question pages — one GET/POST pair per non-loop, non-subtask step.
 * Rendering is the same section-page template for every step (it includes the
 * matching partial by `section.slug`); every decision — page-slice validation,
 * the answer cascade, option lists, Back/Save navigation — comes from the
 * model's `contract`. Specialised to this journey: the one base path, the one
 * layout, grouped navigation.
 */

const open = { auth: false }
const SECTION_PAGE = 'standalone/spike-c/templates/section-page'
const cyaPath = (id) => `${BASE}/${id}/check-your-answers`

const backLinkFor = (quote, stepId, change) =>
  change
    ? cyaPath(quote.id)
    : resolveNav(quote, contract.prev(quote, stepId, grouped))

function viewModel(quote, stepId, request, extras = {}) {
  return {
    layout: LAYOUT,
    pageTitle: contract.stepTitle(stepId),
    section: { slug: stepId, title: contract.stepTitle(stepId) },
    quote,
    items: contract.viewItems(stepId, quote),
    backLink: backLinkFor(quote, stepId, Boolean(request.query.change)),
    breadcrumbs: breadcrumbs(quote, contract.stepTitle(stepId)),
    ...extras
  }
}

// Resolve the quote or short-circuit to the journey base.
const withQuote = (handler) => (request, toolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return toolkit.redirect(BASE)
  }
  return handler(quote, request, toolkit)
}

const renderInvalid = (
  quote,
  stepId,
  request,
  toolkit,
  { errors, errorSummary }
) => {
  // Overlay the typed values onto the saved quote so the partial keeps
  // reading quote.<field>; collect normalises without the cascade.
  const renderQuote = { ...quote, ...contract.collect(stepId, request.payload) }
  return toolkit.view(
    SECTION_PAGE,
    viewModel(renderQuote, stepId, request, {
      errors,
      errorSummary,
      values: request.payload
    })
  )
}

const saveAndRedirect = (quote, stepId, request, toolkit) => {
  const updated = updateQuote(
    quote.id,
    contract.applyAnswer(quote, stepId, request.payload)
  )
  return request.query.change
    ? toolkit.redirect(cyaPath(updated.id))
    : toolkit.redirect(
        resolveNav(updated, contract.next(updated, stepId, grouped))
      )
}

const getHandler = (stepId) =>
  withQuote((quote, request, toolkit) =>
    toolkit.view(SECTION_PAGE, viewModel(quote, stepId, request))
  )

const postHandler = (stepId) =>
  withQuote((quote, request, toolkit) => {
    const validation = contract.validate(stepId, request.payload)
    if (!validation.ok) {
      return renderInvalid(quote, stepId, request, toolkit, validation)
    }
    return saveAndRedirect(quote, stepId, request, toolkit)
  })

/** GET/POST routes for every plain question step in the model. */
export function sectionRoutes() {
  return contract.steps
    .filter((stepId) => contract.stepKind(stepId) === undefined)
    .flatMap((stepId) => [
      {
        method: 'GET',
        path: `${BASE}/{id}/${stepId}`,
        options: open,
        handler: getHandler(stepId)
      },
      {
        method: 'POST',
        path: `${BASE}/{id}/${stepId}`,
        options: open,
        handler: postHandler(stepId)
      }
    ])
}
