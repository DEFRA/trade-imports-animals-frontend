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
import { t } from '../../lib/i18n.js'
import { chrome } from '../../lib/chrome.js'

const BASE = '/prototype/eudpa-249'

const LINE_LEAF_OBLIGATIONS = [
  commodityCode,
  species,
  numberOfAnimals,
  numberOfPackages
]

function formatCode(value) {
  if (!value) return t('commodityLines.codeNotChosen')
  // Label values are message keys (see domain/index.js) — resolve via
  // `t()`, fall through to the raw code if the label map has no entry.
  return t(domain.get(commodityCode.id)?.labels?.[value]) ?? value
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
                text: t('commodityLines.changeLinkText'),
                visuallyHiddenText: t('commodityLines.changeLinkHidden', {
                  lineId: r.fulfilmentId
                })
              }
            ]
          }
        }
      })
      return h.view('features/commodity-lines/list', {
        chrome: chrome(),
        layout: 'layout.njk',
        pageTitle: t('commodityLines.pageTitle'),
        heading: t('commodityLines.heading'),
        lead: t('commodityLines.lead'),
        emptyText: t('commodityLines.empty'),
        addButtonText: t('commodityLines.addButton'),
        backLinkText: t('commodityLines.backToTaskList'),
        lines,
        addHref: `${BASE}/lines/add`,
        backLink: `${BASE}/task-list`,
        crumb: request.plugins?.crumb ?? null,
        breadcrumbs: [
          { text: t('chrome.taskList'), href: `${BASE}/task-list` },
          { text: t('commodityLines.breadcrumbSelf') }
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
