/**
 * line-controllers — bespoke handlers for the commodity-lines index /
 * add / delete UX. Line-major layout: the list renders one summary
 * block per commodity line with a per-row Change link (to the specific
 * per-line page) and a per-line Delete button. Add mints a new line
 * and redirects straight into its first per-line page.
 *
 * Routes:
 *   GET  /lines                  → list existing lines + Add button
 *   POST /lines/add              → mint a new line, redirect to its
 *                                  first per-line page
 *   POST /lines/{id}/delete      → drop the line's leaf values
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
import { forObligation } from '../../lib/presentation.js'

const BASE = '/prototype/eudpa-249'

const LINE_LEAF_OBLIGATIONS = [
  commodityCode,
  species,
  numberOfAnimals,
  numberOfPackages
]

/** The per-line pages a line walks through, in declared order. Each
 *  entry pairs the flow page name with its obligation so we can render
 *  a summary row + Change link. Reads scope from state so a
 *  conditionally-applicable obligation like numberOfPackages appears
 *  only for lines whose commodity code puts it in scope. */
const LINE_PAGES = [
  { pageName: 'commodity-details', obligation: commodityCode },
  { pageName: 'species-details', obligation: species },
  { pageName: 'number-of-animals', obligation: numberOfAnimals },
  { pageName: 'number-of-packages', obligation: numberOfPackages }
]

function labelFor(obligation, value) {
  if (value === undefined || value === null || value === '') return null
  const labels = domain.get(obligation.id)?.labels
  const resolve = (v) => t(labels?.[v]) ?? v
  if (Array.isArray(value)) return value.map(resolve).join(', ')
  return String(resolve(value))
}

function inScopeForLine(state, obligation, lineId) {
  const impl = state.obligations?.[obligation.id]
  if (!impl?.inScope) return false
  const records = impl.records ?? []
  return records.some((r) => r.fulfilmentId === lineId)
}

function lineNumber(lineId) {
  // 'line1' → 1. Falls back to the raw id if the format changes.
  const match = /^line(\d+)$/.exec(lineId)
  return match ? Number(match[1]) : lineId
}

function summariseLine(state, lineId) {
  const rows = []
  for (const { pageName, obligation } of LINE_PAGES) {
    if (!inScopeForLine(state, obligation, lineId)) continue
    const stored = state.fulfilments?.[obligation.id]?.[lineId]
    const label = labelFor(obligation, stored)
    rows.push({
      key: { text: forObligation(obligation).pageTitle },
      value: { text: label ?? t('commodityLines.notFilled') },
      actions: {
        items: [
          {
            href: `${BASE}/lines/${lineId}/${pageName}`,
            text: t('commodityLines.changeLinkText'),
            visuallyHiddenText: `${forObligation(obligation).pageTitle} for ${lineId}`
          }
        ]
      }
    })
  }
  return {
    lineId,
    title: t('commodityLines.lineHeading', { n: lineNumber(lineId) }),
    rows,
    deleteHref: `${BASE}/lines/${lineId}/delete`,
    deleteButtonText: t('commodityLines.deleteButton'),
    deleteVisuallyHiddenText: t('commodityLines.deleteHidden', {
      lineId
    })
  }
}

export const linesIndexController = {
  get: {
    handler(request, h) {
      const state = readState(request)
      const impl = state.obligations[commodityLine.id]
      const lineRecords = impl?.records ?? []
      const lines = lineRecords.map((r) => summariseLine(state, r.fulfilmentId))
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
      const id = addCommodityLine(request, commodityLine, commodityCode)
      // Add-then-fill: jump straight into the new line's first per-line
      // page so the user immediately starts entering data.
      return h.redirect(`${BASE}/lines/${id}/commodity-details`)
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
