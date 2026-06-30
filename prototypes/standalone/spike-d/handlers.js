import { findQuote, updateQuote } from './lib/store.js'
import { contract } from './runtime/index.js'
import { BASE, LAYOUT, breadcrumbs, resolveNav, grouped } from './journey.js'

/**
 * The generic question pages — one GET/POST pair per non-loop, non-subtask step.
 * Rendering is the same section-page template for every step (it includes the
 * matching partial by `section.slug`); every decision — page-slice validation,
 * the answer cascade, option lists, Back/Save navigation — comes from the
 * model's `contract`. Specialised to this journey: the one base path, the one
 * layout, grouped navigation.
 */

const SECTION_PAGE = 'standalone/spike-d/templates/section-page'
const cyaPath = (id) => `${BASE}/${id}/check-your-answers`

function viewModel(quote, stepId, request, extras = {}) {
  const change = Boolean(request.query.change)
  const backLink = change
    ? cyaPath(quote.id)
    : resolveNav(quote, contract.prev(quote, stepId, grouped))
  return {
    layout: LAYOUT,
    pageTitle: contract.stepTitle(stepId),
    section: { slug: stepId, title: contract.stepTitle(stepId) },
    quote,
    items: contract.viewItems(stepId, quote),
    backLink,
    breadcrumbs: breadcrumbs(quote, contract.stepTitle(stepId)),
    ...extras
  }
}

// Resolve the quote once and short-circuit to BASE when it is missing, so each
// handler starts from a quote that is known to exist.
const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(quote, request, responseToolkit)
}

// Overlay the typed values onto the saved quote so the partial keeps reading
// quote.<field>; collect normalises without the cascade.
const renderInvalid = (quote, stepId, request, extras, responseToolkit) => {
  const renderQuote = { ...quote, ...contract.collect(stepId, request.payload) }
  return responseToolkit.view(
    SECTION_PAGE,
    viewModel(renderQuote, stepId, request, {
      ...extras,
      values: request.payload
    })
  )
}

const persistAnswer = (quote, stepId, payload) =>
  updateQuote(quote.id, contract.applyAnswer(quote, stepId, payload))

const redirectAfterSave = (updated, stepId, request, responseToolkit) => {
  if (request.query.change) {
    return responseToolkit.redirect(cyaPath(updated.id))
  }
  return responseToolkit.redirect(
    resolveNav(updated, contract.next(updated, stepId, grouped))
  )
}

function getHandler(stepId) {
  return withQuote((quote, request, responseToolkit) =>
    responseToolkit.view(SECTION_PAGE, viewModel(quote, stepId, request))
  )
}

function postHandler(stepId) {
  return withQuote((quote, request, responseToolkit) => {
    const { ok, errors, errorSummary } = contract.validate(
      stepId,
      request.payload
    )
    if (!ok) {
      return renderInvalid(
        quote,
        stepId,
        request,
        { errors, errorSummary },
        responseToolkit
      )
    }
    const updated = persistAnswer(quote, stepId, request.payload)
    return redirectAfterSave(updated, stepId, request, responseToolkit)
  })
}

/** GET/POST routes for every plain question step in the model. */
export function sectionRoutes() {
  const open = { auth: false }
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
