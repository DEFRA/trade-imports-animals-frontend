/**
 * line-controllers — bespoke handlers for the commodity-lines index /
 * add / delete UX. The flow layer doesn't (yet) model an Add-another
 * primitive, so these are hand-written but still consume the same
 * three-layer modules for scope / options / validation.
 *
 * Routes:
 *   GET  /lines           → list existing lines + Add button
 *   POST /lines/add       → mint a new line, redirect to its first page
 *   POST /lines/{id}/delete
 */

import {
  commodityLine,
  commodityCode,
  species,
  numberOfAnimals,
  numberOfPackages
} from '../../obligations/obligations.js'
import { domain } from '../../domain/index.js'
import {
  readState,
  addCommodityLine,
  deleteCommodityLine
} from '../../lib/state.js'

const BASE = '/prototype/eudpa-249'

const LINE_LEAF_OBLIGATIONS = [
  commodityCode,
  species,
  numberOfAnimals,
  numberOfPackages
]

function formatCode(value) {
  if (!value) return '- Not chosen yet -'
  return domain.get(commodityCode.id)?.labels?.[value] ?? value
}

export const linesIndexController = {
  get: {
    handler(request, h) {
      const state = readState(request)
      const impl = state.obligations[commodityLine.id]
      const lineRecords = impl?.records ?? []
      const lines = lineRecords.map((r) => {
        const code = state.fulfilments[commodityCode.id]?.[r.fulfilmentId]
        return {
          key: { text: r.fulfilmentId },
          value: { text: formatCode(code) },
          actions: {
            items: [
              {
                href: `${BASE}/pages/commodity-details?line=${r.fulfilmentId}`,
                text: 'Change',
                visuallyHiddenText: `commodity code for ${r.fulfilmentId}`
              }
            ]
          }
        }
      })
      return h.view('features/commodity-lines/list', {
        layout: 'layout.njk',
        pageTitle: 'Commodity lines',
        heading: 'Commodity lines',
        lead: 'Add one or more commodity lines. Each line captures a commodity code, species, and count.',
        lines,
        addHref: `${BASE}/lines/add`,
        backLink: `${BASE}/task-list`,
        crumb: request.plugins?.crumb ?? null,
        breadcrumbs: [
          { text: 'Task list', href: `${BASE}/task-list` },
          { text: 'Commodity lines' }
        ]
      })
    }
  }
}

export const linesAddController = {
  post: {
    handler(request, h) {
      addCommodityLine(request, commodityLine, commodityCode)
      return h.redirect(`${BASE}/lines`)
    }
  }
}

export const linesDeleteController = {
  post: {
    handler(request, h) {
      const { id } = request.params
      deleteCommodityLine(request, id, LINE_LEAF_OBLIGATIONS)
      return h.redirect(`${BASE}/lines`)
    }
  }
}
