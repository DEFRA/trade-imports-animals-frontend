import { findQuote, updateQuote } from './store.js'

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

  return (section) => ({
    get: {
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(baseRedirect)
        }
        return h.view('shared/section-page', {
          layout,
          pageTitle: section.title,
          section,
          quote,
          items: section.items ? section.items(quote) : undefined,
          backLink: backLinkFor(quote, section),
          breadcrumbs: breadcrumbs
            ? breadcrumbs(quote, section.title)
            : undefined,
          submitText
        })
      }
    },
    post: {
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(baseRedirect)
        }
        const updated = updateQuote(quote.id, section.collect(request.payload))
        return h.redirect(onSaved(updated, section))
      }
    }
  })
}
