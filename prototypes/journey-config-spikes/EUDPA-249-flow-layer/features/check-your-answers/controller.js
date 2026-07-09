/**
 * cya-controller — check-your-answers.
 *
 * Walks the fulfilments map + the state.obligations impl to build a
 * summary-list of every filled obligation. Change links resolve via
 * `changeLinkFor` (firstPagePresentingObligation). A soft
 * "you still need to..." banner shows still-unfulfilled mandatories
 * (mid-journey CYA pattern from the parent branch).
 */

import { changeLinkFor, statusOfJourney } from '../../contract.js'
import { readState } from '../../lib/state.js'
import { forObligation } from '../../lib/presentation.js'
import { obligations as v4Obligations } from '../../obligations/obligations.js'
import { domain } from '../../domain/index.js'

const BASE = '/prototype/eudpa-249'

function formatValue(value, obligation) {
  const labels = domain.get(obligation.id)?.labels
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) {
    return value.map((v) => labels?.[v] ?? v).join(', ')
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([lineId, v]) => `${lineId}: ${labels?.[v] ?? v}`)
      .join('; ')
  }
  return String(labels?.[value] ?? value)
}

export const cyaController = {
  get: {
    handler(request, h) {
      const state = readState(request)
      const rows = []
      const prompts = []
      const obligationsById = new Map(v4Obligations.map((o) => [o.id, o]))

      for (const [oblId, impl] of Object.entries(state.obligations)) {
        const obligation = obligationsById.get(oblId)
        if (!obligation || !impl.inScope) continue
        const stored = state.fulfilments[oblId]
        const presentation = forObligation(obligation)
        const changePage = changeLinkFor(oblId)
        const href = changePage ? `${BASE}/pages/${changePage.page}` : null
        // Prefer the obligation's declared status (set at the top level
        // for line-scoped obligations like numberOfPackages where impl
        // carries `records[].status` instead of a top-level `impl.status`);
        // fall back to impl for scoped obligations that only surface their
        // status via applyTo.
        const isMandatory =
          (obligation.status ?? impl.status ?? 'mandatory') === 'mandatory'
        if (
          stored === undefined ||
          stored === null ||
          (typeof stored === 'string' && stored === '')
        ) {
          if (isMandatory && href) {
            prompts.push({
              text: `Enter a value for ${presentation.pageTitle}`,
              href,
              because: []
            })
          }
          continue
        }
        rows.push({
          key: { text: presentation.pageTitle },
          value: { text: formatValue(stored, obligation) },
          actions: href
            ? {
                items: [
                  {
                    href,
                    text: 'Change',
                    visuallyHiddenText: presentation.pageTitle
                  }
                ]
              }
            : undefined
        })
      }

      return h.view('features/check-your-answers/template', {
        layout: 'layout.njk',
        pageTitle: 'Check your answers',
        heading: 'Check your answers',
        rows,
        prompts,
        bannerHeading: 'You still need to complete some sections',
        journeyState: statusOfJourney(state),
        crumb: request.plugins?.crumb ?? null,
        breadcrumbs: [
          { text: 'Task list', href: `${BASE}/task-list` },
          { text: 'Check your answers' }
        ]
      })
    }
  }
}
