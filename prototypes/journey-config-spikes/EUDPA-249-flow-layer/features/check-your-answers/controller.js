/**
 * cya-controller — check-your-answers.
 *
 * Walks the fulfilments map + the state.obligations impl to build a
 * summary-list of every filled obligation. Change links resolve via
 * `changeLinkFor` (firstPagePresentingObligation). Line-scoped
 * obligations (presentsForEach pages) emit ONE row per line record
 * with per-line Change URLs (`/lines/{lineId}/{page}`); singleton
 * obligations emit one row with a `/pages/{page}` URL.
 *
 * A soft "you still need to..." banner shows still-unfulfilled
 * mandatories (mid-journey CYA pattern from the parent branch).
 */

import { changeLinkFor, statusOfJourney } from '../../contract.js'
import { readState } from '../../lib/state.js'
import { forObligation } from '../../lib/presentation.js'
import { obligations as v4Obligations } from '../../obligations/obligations.js'
import { domain } from '../../domain/index.js'
import { t, tOrNull } from '../../lib/i18n.js'
import { chrome } from '../../lib/chrome.js'

const BASE = '/prototype/eudpa-249'

function lineNumber(lineId) {
  // 'line1' → 1. Falls back to the raw id if the format changes.
  const match = /^line(\d+)$/.exec(lineId)
  return match ? Number(match[1]) : lineId
}

/**
 * Format a scalar or array value against an obligation's labels map.
 * Callers must NOT pass a per-line object (`{ line1: ... }`) — those
 * are unpacked at the row-emission site so each line renders its own
 * row with its own Change URL.
 */
function formatSingle(value, obligation) {
  const domainEntry = domain.get(obligation.id)
  const labels = domainEntry?.labels
  // `tOrNull` (not `t`) so a mistyped label key falls through to the
  // raw stored code rather than shipping the dotted-path to the UI.
  const label = (v) => tOrNull(labels?.[v]) ?? v
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.map(label).join(', ')
  // Address-block composite value — join the non-empty sub-fields with
  // comma separators for a single-line CYA summary. Order follows the
  // domain entry's subFields declaration.
  if (typeof value === 'object' && domainEntry?.type === 'address') {
    const parts = (domainEntry.subFields ?? [])
      .map((sub) => value[sub])
      .filter((v) => typeof v === 'string' && v.trim() !== '')
    return parts.join(', ')
  }
  return String(label(value))
}

function isBlankLeaf(value) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  // Composite value (e.g. address block) with all leaves blank is
  // treated as unfilled — the row would otherwise render as a comma
  // sequence with no content, and the still-needed prompt would be
  // wrongly suppressed for a mandatory obligation.
  if (typeof value === 'object' && Object.keys(value).length > 0) {
    return Object.values(value).every(
      (v) => v === undefined || v === null || v === ''
    )
  }
  return false
}

function isMandatoryOnRecord(obligation, impl, record) {
  return (
    (obligation.status ?? record?.status ?? impl.status ?? 'mandatory') ===
    'mandatory'
  )
}

function hrefForChange(oblId, lineId) {
  const changePage = changeLinkFor(oblId)
  if (!changePage) return null
  if (changePage.presentsForEach) {
    if (!lineId) return null
    return `${BASE}/lines/${lineId}/${changePage.page}`
  }
  return `${BASE}/pages/${changePage.page}`
}

function pushPrompt(prompts, presentation, href, lineId) {
  const label = lineId
    ? `${presentation.pageTitle} (commodity line ${lineNumber(lineId)})`
    : presentation.pageTitle
  prompts.push({
    text: t('cya.promptEnterValue', { label }),
    href,
    because: []
  })
}

function pushRow(rows, presentation, valueText, href, lineId) {
  const keyText = lineId
    ? `${presentation.pageTitle} (commodity line ${lineNumber(lineId)})`
    : presentation.pageTitle
  rows.push({
    key: { text: keyText },
    value: { text: valueText },
    actions: href
      ? {
          items: [
            {
              href,
              text: t('cya.changeLinkText'),
              visuallyHiddenText: keyText
            }
          ]
        }
      : undefined
  })
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
        const presentation = forObligation(obligation)
        const stored = state.fulfilments[oblId]

        // Line-scoped obligations (presentsForEach pages) — one row per
        // record with a per-line Change URL. The group container
        // itself (commodityLine) hits this branch too; its records are
        // walked but each has a blank leaf and a null Change URL, so
        // the loop passes through without emitting rows or prompts.
        if (Array.isArray(impl.records)) {
          for (const record of impl.records) {
            const lineId = record.fulfilmentId
            if (!lineId) continue
            const leaf = stored?.[lineId]
            const href = hrefForChange(oblId, lineId)
            const mandatory = isMandatoryOnRecord(obligation, impl, record)
            if (isBlankLeaf(leaf)) {
              if (mandatory && href) {
                pushPrompt(prompts, presentation, href, lineId)
              }
              continue
            }
            pushRow(
              rows,
              presentation,
              formatSingle(leaf, obligation),
              href,
              lineId
            )
          }
          continue
        }

        // Singleton case — one row per obligation.
        const href = hrefForChange(oblId, null)
        const mandatory =
          (obligation.status ?? impl.status ?? 'mandatory') === 'mandatory'
        if (isBlankLeaf(stored)) {
          if (mandatory && href) pushPrompt(prompts, presentation, href, null)
          continue
        }
        pushRow(
          rows,
          presentation,
          formatSingle(stored, obligation),
          href,
          null
        )
      }

      return h.view('features/check-your-answers/template', {
        chrome: chrome(),
        layout: 'layout.njk',
        pageTitle: t('cya.pageTitle'),
        heading: t('cya.heading'),
        rows,
        prompts,
        bannerHeading: t('cya.bannerHeading'),
        submitReadyText: t('cya.submitReady'),
        journeyState: statusOfJourney(state),
        crumb: request.plugins?.crumb ?? null,
        breadcrumbs: [
          { text: t('chrome.taskList'), href: `${BASE}/task-list` },
          { text: t('cya.heading') }
        ]
      })
    }
  }
}
