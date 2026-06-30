import { findQuote, updateQuote } from './lib/store.js'
import { contract } from './runtime/contract.js'
import { BASE, LAYOUT, breadcrumbs, resolveNav, grouped } from './journey.js'

/**
 * The generic question pages — one GET/POST pair per non-loop, non-subtask step.
 * Rendering is the same section-page template for every step (it includes the
 * matching partial by `section.slug`); every decision — page-slice validation,
 * the answer cascade, option lists, Back/Save navigation — comes from the
 * model's `contract`. Specialised to this journey: the one base path, the one
 * layout, grouped navigation.
 */

const SECTION_PAGE = 'standalone/spike-c/templates/section-page'
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

function getHandler(stepId) {
  return (request, h) => {
    const quote = findQuote(request.params.id)
    if (!quote) {
      return h.redirect(BASE)
    }
    return h.view(SECTION_PAGE, viewModel(quote, stepId, request))
  }
}

function postHandler(stepId) {
  return (request, h) => {
    const quote = findQuote(request.params.id)
    if (!quote) {
      return h.redirect(BASE)
    }
    const { ok, errors, errorSummary } = contract.validate(
      stepId,
      request.payload
    )
    if (!ok) {
      // Overlay the typed values onto the saved quote so the partial keeps
      // reading quote.<field>; collect normalises without the cascade.
      const renderQuote = {
        ...quote,
        ...contract.collect(stepId, request.payload)
      }
      return h.view(
        SECTION_PAGE,
        viewModel(renderQuote, stepId, request, {
          errors,
          errorSummary,
          values: request.payload
        })
      )
    }
    const updated = updateQuote(
      quote.id,
      contract.applyAnswer(quote, stepId, request.payload)
    )
    if (request.query.change) {
      return h.redirect(cyaPath(updated.id))
    }
    return h.redirect(
      resolveNav(updated, contract.next(updated, stepId, grouped))
    )
  }
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
