import { findQuote, updateQuote } from '../../shared/store.js'
import { pathForStep, resolveNav } from './nav.js'

/**
 * Model-driven replacement for prototypes/shared/section-controller.js.
 *
 * Identical rendering (the shared section-page njk + partials), but every
 * decision that used to be hand-written per section now comes from the spike's
 * contract: page-slice validation (`validate`), the answer cascade
 * (`applyAnswer`), option lists (`viewItems`) and Back / Save navigation
 * (`prev` / `next`). The variant only supplies the base path, layout, shape and
 * breadcrumbs.
 */
export function modelSectionHandlers({
  contract,
  base,
  layout,
  shape,
  breadcrumbs
}) {
  const cyaPath = (id) => `${base}/${id}/check-your-answers`

  const viewModel = (quote, stepId, request, extras = {}) => {
    const change = Boolean(request.query.change)
    const backLink = change
      ? cyaPath(quote.id)
      : resolveNav(contract, base, quote, contract.prev(quote, stepId, shape))
    return {
      layout,
      pageTitle: contract.stepTitle(stepId),
      // section-page.njk reads `section.slug` (to include the partial) and
      // `section.title`; both come straight off the model.
      section: { slug: stepId, title: contract.stepTitle(stepId) },
      quote,
      items: contract.viewItems(stepId, quote),
      backLink,
      breadcrumbs: breadcrumbs
        ? breadcrumbs(quote, contract.stepTitle(stepId))
        : undefined,
      ...extras
    }
  }

  return (stepId) => ({
    get: {
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(base)
        }
        return h.view('shared/section-page', viewModel(quote, stepId, request))
      }
    },
    post: {
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(base)
        }
        const { ok, errors, errorSummary } = contract.validate(
          stepId,
          request.payload
        )
        if (!ok) {
          // Overlay the user's typed values onto the saved quote so the partial
          // keeps reading `quote.<field>`; `collect` normalises without cascade.
          const renderQuote = {
            ...quote,
            ...contract.collect(stepId, request.payload)
          }
          return h.view(
            'shared/section-page',
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
          resolveNav(
            contract,
            base,
            updated,
            contract.next(updated, stepId, shape)
          )
        )
      }
    }
  })
}

/** Generic section routes for every non-loop, non-subtask step in the model. */
export function modelSectionRoutes({ contract, base, makeHandlers }) {
  const open = { auth: false }
  return contract.steps
    .filter((stepId) => contract.stepKind(stepId) === undefined)
    .flatMap((stepId) => {
      const handlers = makeHandlers(stepId)
      return [
        {
          method: 'GET',
          path: `${base}/{id}/${stepId}`,
          options: open,
          ...handlers.get
        },
        {
          method: 'POST',
          path: `${base}/{id}/${stepId}`,
          options: open,
          ...handlers.post
        }
      ]
    })
}

export { pathForStep }
