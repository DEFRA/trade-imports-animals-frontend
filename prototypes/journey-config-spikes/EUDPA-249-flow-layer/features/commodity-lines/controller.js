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
  unitRecord,
  obligations as v4Obligations
} from '../../obligations/obligations.js'
import { flow } from '../../flow/flow.js'
import { domain } from '../../domain/index.js'
import {
  readState,
  addCommodityLine,
  deleteCommodityLine
} from '../../lib/state.js'
import { t, tOrNull } from '../../lib/i18n.js'
import { chrome } from '../../lib/chrome.js'
import { forObligation } from '../../lib/presentation.js'

const BASE = '/prototype/eudpa-249'

/** The per-line pages a line walks through, in declared order. Derived
 *  at import time from the flow's `commodity-lines-details` subsection
 *  so a new presentsForEach page inserted in the flow automatically
 *  appears in the /lines summary — previously this was a hand-maintained
 *  list and iteration 6 (commodityType) forgot to add itself, so the
 *  Commodity type row was silently missing from every line's summary
 *  block. Reads scope from state so a conditionally-applicable
 *  obligation like numberOfPackages appears only for lines whose
 *  commodity code puts it in scope. */
export const LINE_PAGES = deriveLinePages(flow)

/** Every leaf obligation whose stored value is keyed by commodity-line
 *  fulfilmentId — derived from LINE_PAGES so the two lists cannot drift
 *  apart. Previously this used `within === commodityLine` on the raw
 *  obligations manifest, which (a) pulled in `unitRecord` (a group,
 *  not a leaf) and (b) missed depth-2 leaves whose `within` is
 *  `unitRecord`. Depth-2 leaves aren't presented yet in the spike, so
 *  Delete only needs the depth-1 leaves LINE_PAGES already enumerates;
 *  when per-unit pages get wired we'll need to also purge composite-
 *  key fulfilments for the within: unitRecord leaves. */
export const LINE_LEAF_OBLIGATIONS = LINE_PAGES.map((p) => p.obligation)

function deriveLinePages(flowNode) {
  const details = findSubsection(flowNode, 'commodity-lines-details')
  if (!details) return []
  return (details.children ?? [])
    .filter((page) => page.presentsForEach)
    .map((page) => ({
      pageName: page.page,
      obligation: page.presentsForEach.obligation
    }))
}

function findSubsection(node, id) {
  if (node.kind === 'subsection' && node.id === id) return node
  for (const child of node.children ?? node.sections ?? []) {
    const hit = findSubsection(child, id)
    if (hit) return hit
  }
  return null
}

function labelFor(obligation, value) {
  if (value === undefined || value === null || value === '') return null
  // Empty array (multi-select cleared) counts as unfilled so the row
  // falls through to the notFilled placeholder instead of rendering
  // an empty cell.
  if (Array.isArray(value) && value.length === 0) return null
  const labels = domain.get(obligation.id)?.labels
  // `tOrNull` (not `t`) so that a mistyped label key falls through to
  // the raw stored code rather than shipping the dotted-path to the UI.
  const resolve = (v) => tOrNull(labels?.[v]) ?? v
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

/** True iff this line's commodityCode opens any WIRED unit-scoped
 *  obligation — i.e. clicking Manage animals will lead to a page the
 *  user can actually fill. Uses the allowListed helper's exposed
 *  metadata rather than executing the applyTo closure, so we can tell
 *  at rest without hallucinating a fake unit record. If step 5 wires
 *  more unit obligations, this generalises automatically because we
 *  iterate the manifest. */
function lineHasWiredUnitObligation(state, lineId) {
  const lineCode = state.fulfilments?.[commodityCode.id]?.[lineId]
  if (!lineCode) return false
  const unitObligations = v4Obligations.filter((o) => o.within === unitRecord)
  for (const obligation of unitObligations) {
    if (!domain.has(obligation.id)) continue
    const meta = obligation.applyTo?.metadata
    if (!meta) continue
    if (meta.type === 'allowListed' && meta.values?.includes(lineCode)) {
      return true
    }
    if (meta.type === 'allowListedByPredicate') {
      // The inverse-gate case (identificationDetails / description).
      // Step 5 will wire these; when it does, the metadata will let us
      // ask the predicate directly. For iteration 9 there are no
      // wired allowListedByPredicate obligations, so we conservatively
      // return true here — the units list gracefully renders nothing
      // if the caller can't seed.
      return true
    }
  }
  return false
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
            visuallyHiddenText: t('commodityLines.changeLinkHidden', {
              label: forObligation(obligation).pageTitle,
              n: lineNumber(lineId)
            })
          }
        ]
      }
    })
  }
  const showManageAnimals = lineHasWiredUnitObligation(state, lineId)
  return {
    lineId,
    title: t('commodityLines.lineHeading', { n: lineNumber(lineId) }),
    rows,
    deleteHref: `${BASE}/lines/${lineId}/delete`,
    deleteButtonText: t('commodityLines.deleteButton'),
    deleteVisuallyHiddenText: t('commodityLines.deleteHidden', {
      n: lineNumber(lineId)
    }),
    manageAnimalsHref: showManageAnimals
      ? `${BASE}/lines/${lineId}/units`
      : null,
    manageAnimalsText: showManageAnimals
      ? t('commodityLines.manageAnimalsButton')
      : null
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
