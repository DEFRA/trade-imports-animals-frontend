import { findQuote, updateQuote } from './lib/store.js'
import { contract } from './runtime/contract.js'
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

const SECTION_PAGE = 'standalone/spike-b/templates/section-page'
const cyaPath = (id) => `${BASE}/${id}/check-your-answers`

const backLinkFor = (quote, stepId, change) =>
  change
    ? cyaPath(quote.id)
    : resolveNav(quote, contract.prev(quote, stepId, grouped))

function viewModel(quote, stepId, request, extras = {}) {
  const change = Boolean(request.query.change)
  const title = contract.stepTitle(stepId)
  return {
    layout: LAYOUT,
    pageTitle: title,
    section: { slug: stepId, title },
    quote,
    items: contract.viewItems(stepId, quote),
    backLink: backLinkFor(quote, stepId, change),
    breadcrumbs: breadcrumbs(quote, title),
    ...extras
  }
}

const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(request, responseToolkit, quote)
}

const renderValidationErrors = (
  stepId,
  request,
  quote,
  { errors, errorSummary },
  responseToolkit
) => {
  // Overlay the typed values onto the saved quote so the partial keeps
  // reading quote.<field>; collect normalises without the cascade.
  const renderQuote = {
    ...quote,
    ...contract.collect(stepId, request.payload)
  }
  return responseToolkit.view(
    SECTION_PAGE,
    viewModel(renderQuote, stepId, request, {
      errors,
      errorSummary,
      values: request.payload
    })
  )
}

const redirectAfterSave = (updated, stepId, request, responseToolkit) =>
  request.query.change
    ? responseToolkit.redirect(cyaPath(updated.id))
    : responseToolkit.redirect(
        resolveNav(updated, contract.next(updated, stepId, grouped))
      )

function getHandler(stepId) {
  return withQuote((request, responseToolkit, quote) =>
    responseToolkit.view(SECTION_PAGE, viewModel(quote, stepId, request))
  )
}

function postHandler(stepId) {
  return withQuote((request, responseToolkit, quote) => {
    const { ok, errors, errorSummary } = contract.validate(
      stepId,
      request.payload
    )
    if (!ok) {
      return renderValidationErrors(
        stepId,
        request,
        quote,
        { errors, errorSummary },
        responseToolkit
      )
    }
    const updated = updateQuote(
      quote.id,
      contract.applyAnswer(quote, stepId, request.payload)
    )
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
