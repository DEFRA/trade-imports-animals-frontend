import { findQuote, updateQuote } from './store.js'
import { validatePayload } from './validate.js'

/**
 * Builds GET/POST handlers for a single question section, shared by every
 * variant. The variant supplies its own navigation (where Back and Save go) and
 * its own layout; everything else — prefill, save, the form template — is shared.
 *
 * @param {object} config
 * @param {string} config.layout - variant layout template path
 * @param {string} config.baseRedirect - where to send a request with no draft
 * @param {(quote: object, section: object) => string} config.backLinkFor
 * @param {(quote: object, section: object) => string} config.onSaved
 * @param {string} [config.submitText]
 * @param {(quote: object, title: string) => Array} [config.breadcrumbs]
 * @returns {(section: object) => { get: object, post: object }}
 */
export function sectionHandlers(config) {
  const {
    layout,
    baseRedirect,
    backLinkFor,
    onSaved,
    submitText,
    breadcrumbs
  } = config

  // When reached from check-your-answers (?change=1), Back and Save both
  // round-trip straight back to CYA instead of re-walking the journey.
  const cyaPath = (id) => `${baseRedirect}/${id}/check-your-answers`

  const viewModel = (quote, section, request, extras = {}) => {
    const change = Boolean(request.query.change)
    return {
      layout,
      pageTitle: section.title,
      section,
      quote,
      items: section.items ? section.items(quote) : undefined,
      backLink: change ? cyaPath(quote.id) : backLinkFor(quote, section),
      breadcrumbs: breadcrumbs ? breadcrumbs(quote, section.title) : undefined,
      submitText,
      ...extras
    }
  }

  return (section) => ({
    get: {
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(baseRedirect)
        }
        return h.view('shared/section-page', viewModel(quote, section, request))
      }
    },
    post: {
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(baseRedirect)
        }
        const { value, errors, errorSummary } = validatePayload(
          section.schema,
          request.payload
        )
        if (errors) {
          // Re-render with the user's typed values overlaid onto the saved
          // quote — `section.collect` already knows how to reshape the payload
          // into the section's stored shape, so the partial keeps reading
          // `quote.<field>` uniformly. `errors` drives per-field errorMessage
          // and `errorSummary` drives the page-top govukErrorSummary.
          const renderQuote = { ...quote, ...section.collect(request.payload) }
          return h.view(
            'shared/section-page',
            viewModel(renderQuote, section, request, {
              errors,
              errorSummary,
              values: request.payload
            })
          )
        }
        const updated = updateQuote(quote.id, section.collect(value))
        return h.redirect(
          request.query.change ? cyaPath(updated.id) : onSaved(updated, section)
        )
      }
    }
  })
}
