/**
 * unit-controllers — bespoke handlers for the per-line units UX.
 *
 * Line-major layout, depth-2: the list at
 * `/lines/{lineId}/units` renders one summary block per unit that
 * belongs to the line, with a per-row Change link (to the specific
 * per-unit page) and a per-unit Delete button. Add mints a new unit
 * for the line and redirects into its first per-unit page.
 *
 * Routes:
 *   GET  /lines/{lineId}/units                → list units for line
 *   POST /lines/{lineId}/units/add            → mint a unit + redirect
 *   POST /lines/{lineId}/units/{unitId}/delete → drop the unit's leaves
 */

import {
  commodityLine,
  commodityCode,
  unitRecord,
  obligations as v4Obligations
} from '../../obligations/obligations.js'
import { flow } from '../../flow/flow.js'
import { domain } from '../../domain/index.js'
import { readState, addUnitRecord, deleteUnitRecord } from '../../lib/state.js'
import { t, tOrNull } from '../../lib/i18n.js'
import { chrome } from '../../lib/chrome.js'
import { forObligation } from '../../lib/presentation.js'

const BASE = '/prototype/eudpa-249'

/** The per-unit pages a unit walks through, in declared order. Derived
 *  at import time from every subsection in the flow whose children
 *  carry `presentsForEach.forEachOf === unitRecord`. Same discipline
 *  as commodity-lines/controller.js LINE_PAGES: a new per-unit page
 *  dropped into the flow appears in the summary automatically. */
export const UNIT_PAGES = deriveUnitPages(flow)

/** Every leaf obligation whose stored value is keyed by a composite
 *  `${lineId}/${unitId}` — derived from UNIT_PAGES so the two lists
 *  cannot drift apart. Used by deleteUnitRecord to purge every
 *  per-unit leaf when the user deletes a unit. */
export const UNIT_LEAF_OBLIGATIONS = UNIT_PAGES.map((p) => p.obligation)

function deriveUnitPages(flowNode) {
  const out = []
  collectUnitPages(flowNode, out)
  return out
}

function collectUnitPages(node, out) {
  if (node.presentsForEach && node.presentsForEach.forEachOf === unitRecord) {
    out.push({
      pageName: node.page,
      obligation: node.presentsForEach.obligation
    })
  }
  for (const child of node.children ?? node.sections ?? []) {
    collectUnitPages(child, out)
  }
}

function labelFor(obligation, value) {
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value) && value.length === 0) return null
  const domainEntry = domain.get(obligation.id)
  // Composite address value — join non-empty sub-fields with commas
  // for a single-line summary. Same convention as CYA's formatSingle.
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    domainEntry?.type === 'address'
  ) {
    const parts = (domainEntry.subFields ?? [])
      .map((sub) => value[sub])
      .filter((v) => typeof v === 'string' && v.trim() !== '')
    return parts.length ? parts.join(', ') : null
  }
  const labels = domainEntry?.labels
  const resolve = (v) => tOrNull(labels?.[v]) ?? v
  if (Array.isArray(value)) return value.map(resolve).join(', ')
  return String(resolve(value))
}

function inScopeForUnit(state, obligation, lineId, unitId) {
  const impl = state.obligations?.[obligation.id]
  if (!impl?.inScope) return false
  const compositeKey = `${lineId}/${unitId}`
  const records = impl.records ?? []
  return records.some((r) => r.fulfilmentId === compositeKey)
}

function lineNumber(lineId) {
  const match = /^line(\d+)$/.exec(lineId)
  return match ? Number(match[1]) : lineId
}

function unitNumber(unitId) {
  const match = /^unit(\d+)$/.exec(unitId)
  return match ? Number(match[1]) : unitId
}

function summariseUnit(state, lineId, unitId) {
  const rows = []
  for (const { pageName, obligation } of UNIT_PAGES) {
    if (!inScopeForUnit(state, obligation, lineId, unitId)) continue
    const compositeKey = `${lineId}/${unitId}`
    const stored = state.fulfilments?.[obligation.id]?.[compositeKey]
    const label = labelFor(obligation, stored)
    rows.push({
      key: { text: forObligation(obligation).pageTitle },
      value: { text: label ?? t('units.notFilled') },
      actions: {
        items: [
          {
            href: `${BASE}/lines/${lineId}/units/${unitId}/${pageName}`,
            text: t('units.changeLinkText'),
            visuallyHiddenText: t('units.changeLinkHidden', {
              label: forObligation(obligation).pageTitle,
              lineN: lineNumber(lineId),
              unitN: unitNumber(unitId)
            })
          }
        ]
      }
    })
  }
  return {
    unitId,
    title: t('units.unitHeading', {
      lineN: lineNumber(lineId),
      unitN: unitNumber(unitId)
    }),
    rows,
    deleteHref: `${BASE}/lines/${lineId}/units/${unitId}/delete`,
    deleteButtonText: t('units.deleteButton'),
    deleteVisuallyHiddenText: t('units.deleteHidden', {
      lineN: lineNumber(lineId),
      unitN: unitNumber(unitId)
    })
  }
}

function lineExists(state, lineId) {
  const records = state.obligations?.[commodityLine.id]?.records ?? []
  return records.some((r) => r.fulfilmentId === lineId)
}

/** Pick a unit-scoped obligation whose applyTo lets this line's
 *  commodity code open at least one record — used as the seed
 *  obligation on addUnitRecord. Uses the `allowListed` helper's
 *  `.metadata` sidecar rather than executing the applyTo closure,
 *  because at add-time no unit exists yet, so `impl.inScope` is
 *  false for the very obligation we want to seed (chicken-and-egg:
 *  the evaluator's projection over `unitRecord.records` returns [],
 *  so the applyTo closure short-circuits before checking codes).
 *  Only returns WIRED obligations (`domain.has(id)`) so we never
 *  seed on something the routes.js walk can't render. */
function pickSeedObligationForLine(state, lineId) {
  const lineCode = state.fulfilments?.[commodityCode.id]?.[lineId]
  if (!lineCode) return null
  // Prefer mandatory obligations first so add-then-fill drops the
  // user on a page they MUST complete rather than a first-listed
  // optional. permanentAddress is currently the ONLY mandatory
  // unit-scoped obligation, and it happens to be declared last in
  // the manifest — without this two-pass we'd redirect to passport
  // (optional, declared earlier) even on a pets line where
  // permanentAddress must be filled.
  const unitObligations = v4Obligations.filter((o) => o.within === unitRecord)
  const byStatus = [
    unitObligations.filter((o) => o.status === 'mandatory'),
    unitObligations.filter((o) => o.status !== 'mandatory')
  ]
  for (const bucket of byStatus) {
    for (const obligation of bucket) {
      if (!domain.has(obligation.id)) continue
      const meta = obligation.applyTo?.metadata
      if (!meta) continue
      if (meta.type === 'allowListed' && meta.values?.includes(lineCode)) {
        return obligation
      }
      if (
        meta.type === 'allowListedByPredicate' &&
        meta.predicate?.(lineCode)
      ) {
        // Inverse-gate case (identificationDetails / description) —
        // helpers.js exposes the predicate on the metadata so we can
        // ask "would this code be admitted?" without executing the
        // whole applyTo closure.
        return obligation
      }
    }
  }
  return null
}

export const linesUnitsIndexController = {
  get: {
    handler(request, h) {
      const { lineId } = request.params
      const state = readState(request)
      if (!lineExists(state, lineId)) {
        return h.redirect(`${BASE}/lines`)
      }
      const impl = state.obligations[unitRecord.id]
      const unitRecords = (impl?.records ?? []).filter((r) =>
        r.fulfilmentId.startsWith(`${lineId}/`)
      )
      const units = unitRecords.map((r) => {
        const unitId = r.fulfilmentId.slice(lineId.length + 1)
        return summariseUnit(state, lineId, unitId)
      })
      return h.view('features/units/list', {
        chrome: chrome(),
        layout: 'layout.njk',
        pageTitle: t('units.pageTitle', { lineN: lineNumber(lineId) }),
        heading: t('units.heading', { lineN: lineNumber(lineId) }),
        lead: t('units.lead'),
        emptyText: t('units.empty'),
        addButtonText: t('units.addButton'),
        backLinkText: t('units.backToLines'),
        units,
        addHref: `${BASE}/lines/${lineId}/units/add`,
        backLink: `${BASE}/lines`,
        crumb: request.plugins?.crumb ?? null,
        breadcrumbs: [
          { text: t('chrome.taskList'), href: `${BASE}/task-list` },
          {
            text: t('commodityLines.breadcrumbSelf'),
            href: `${BASE}/lines`
          },
          {
            text: t('units.breadcrumbSelf', { lineN: lineNumber(lineId) })
          }
        ]
      })
    }
  }
}

export const linesUnitsAddController = {
  post: {
    handler(request, h) {
      const { lineId } = request.params
      const state = readState(request)
      if (!lineExists(state, lineId)) {
        return h.redirect(`${BASE}/lines`)
      }
      const seed = pickSeedObligationForLine(state, lineId)
      if (!seed) {
        // No per-unit obligation is in scope for this line's commodity
        // code (e.g. transit-only cattle) — bounce back without
        // minting.
        return h.redirect(`${BASE}/lines/${lineId}/units`)
      }
      const unitId = addUnitRecord(request, lineId, seed)
      // Add-then-fill: jump straight into the new unit's first per-unit
      // page. Find the first page in UNIT_PAGES whose obligation the
      // seed matched; falling back to the first UNIT_PAGES entry.
      const firstPage =
        UNIT_PAGES.find((p) => p.obligation.id === seed.id) ?? UNIT_PAGES[0]
      if (!firstPage) {
        return h.redirect(`${BASE}/lines/${lineId}/units`)
      }
      return h.redirect(
        `${BASE}/lines/${lineId}/units/${unitId}/${firstPage.pageName}`
      )
    }
  }
}

export const linesUnitsDeleteController = {
  post: {
    handler(request, h) {
      const { lineId, unitId } = request.params
      deleteUnitRecord(request, lineId, unitId, UNIT_LEAF_OBLIGATIONS)
      return h.redirect(`${BASE}/lines/${lineId}/units`)
    }
  }
}
