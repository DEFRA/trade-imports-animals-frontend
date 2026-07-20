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

import {
  changeLinkFor,
  groupInvariantErrorsForState,
  statusOfJourney
} from '../../contract.js'
import { readState } from '../../lib/state.js'
import { forObligation } from '../../lib/presentation.js'
import {
  commodityLine,
  unitRecord,
  obligations as v4Obligations
} from '../../obligations/obligations.js'
import { domain } from '../../domain/index.js'
import { t, tOrNull } from '../../lib/i18n.js'
import { chrome } from '../../lib/chrome.js'
import { isBlankValue } from '../../lib/is-blank-value.js'

const BASE = '/prototype/eudpa-249'

/** 1-based ordinal position of `lineId` in the current commodityLine
 *  records list — same convention used across the units index and the
 *  /lines summary blocks. */
function ordinalOfLineId(state, lineId) {
  const records = state.obligations?.[commodityLine.id]?.records ?? []
  const idx = records.findIndex((r) => r.fulfilmentId === lineId)
  return idx >= 0 ? idx + 1 : lineId
}

/** 1-based ordinal position of a unit within its parent line, matching
 *  the units index page's rendering. */
function ordinalOfUnitId(state, lineId, unitId) {
  const compositeKey = `${lineId}/${unitId}`
  const records = state.obligations?.[unitRecord.id]?.records ?? []
  const perLine = records.filter((r) => r.fulfilmentId.startsWith(`${lineId}/`))
  const idx = perLine.findIndex((r) => r.fulfilmentId === compositeKey)
  return idx >= 0 ? idx + 1 : unitId
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
  // domain entry's subFields declaration. Enum sub-fields (country) are
  // resolved via their per-sub-field labels map so the summary reads
  // "United Kingdom" not "GB".
  if (typeof value === 'object' && domainEntry?.type === 'address') {
    const rules = domainEntry.subFieldRules ?? {}
    const parts = (domainEntry.subFields ?? [])
      .map((sub) => {
        const raw = value[sub]
        // 2nd-code-review #12: preserve numeric / boolean sub-field
        // values (rare but possible for future composites) by coercing
        // to string rather than filtering.
        if (raw === undefined || raw === null) return null
        const asString = typeof raw === 'string' ? raw : String(raw)
        if (asString.trim() === '') return null
        const rule = rules[sub]
        if (rule?.type === 'enum' && rule.labels) {
          return tOrNull(rule.labels[asString]) ?? asString
        }
        return asString
      })
      .filter((v) => v !== null)
    return parts.join(', ')
  }
  // 2nd-code-review #9: any other object we don't know how to format
  // would coerce to `[object Object]` via String(). Return the raw
  // stored value's JSON serialization so a stakeholder sees the data
  // rather than the useless coercion. In practice this only fires if
  // a future composite obligation lands without a CYA-side formatter;
  // preferable to silently rendering "[object Object]" on CYA.
  if (typeof value === 'object') return JSON.stringify(value)
  return String(label(value))
}

function isMandatoryOnRecord(obligation, impl, record) {
  return (
    (obligation.status ?? record?.status ?? impl.status ?? 'mandatory') ===
    'mandatory'
  )
}

function hrefForChange(oblId, lineId, unitId) {
  const changePage = changeLinkFor(oblId)
  if (!changePage) return null
  if (changePage.presentsForEach) {
    if (!lineId) return null
    // Unit-scoped presentsForEach (forEachOf: unitRecord) routes
    // through the depth-2 per-unit page URL rather than the depth-1
    // per-line one. The line-scoped case is unchanged.
    if (unitId) {
      return `${BASE}/lines/${lineId}/units/${unitId}/${changePage.page}`
    }
    return `${BASE}/lines/${lineId}/${changePage.page}`
  }
  return `${BASE}/pages/${changePage.page}`
}

/** Human-readable key label for a CYA row/prompt. Three shapes:
 *   singleton (lineId null)             → "PageTitle"
 *   line-scoped (lineId set)            → "PageTitle (commodity line N)"
 *   unit-scoped (lineId + unitId set)   → "PageTitle (animal M on commodity line N)"
 *  All ordinals resolve via `ordinalOfLineId` / `ordinalOfUnitId`
 *  so a deleted-line renumbering matches every other display
 *  surface (units-index page, /lines summary, CYA unit-scoped
 *  rows, group-invariant prompts). Line ids are session-monotonic
 *  and never recycle — parsing digits from the raw id would drift
 *  from the visible ordinal after any delete. */
function keyLabelFor(state, presentation, lineId, unitId) {
  if (unitId) {
    return `${presentation.pageTitle} (animal ${ordinalOfUnitId(
      state,
      lineId,
      unitId
    )} on commodity line ${ordinalOfLineId(state, lineId)})`
  }
  if (lineId) {
    return `${presentation.pageTitle} (commodity line ${ordinalOfLineId(state, lineId)})`
  }
  return presentation.pageTitle
}

function pushPrompt(prompts, state, presentation, href, lineId, unitId) {
  const label = keyLabelFor(state, presentation, lineId, unitId)
  prompts.push({
    text: t('cya.promptEnterValue', { label }),
    href,
    because: []
  })
}

/** Emit "Complete the permanent address for animal N on commodity
 *  line M" — used when a per-unit permanent-address record is
 *  present but structurally incomplete (some required sub-field is
 *  still blank). Link goes to the specific per-unit page so the user
 *  can jump straight in. Only used for permanentAddress today. */
function pushAddressUnitPrompt(prompts, state, compositeKey) {
  const [lineId, unitId] = compositeKey.split('/')
  if (!lineId || !unitId) return
  prompts.push({
    text: t('cya.promptCompleteAddressForUnit', {
      lineN: ordinalOfLineId(state, lineId),
      unitN: ordinalOfUnitId(state, lineId, unitId)
    }),
    href: `${BASE}/lines/${lineId}/units/${unitId}/permanent-address`,
    because: []
  })
}

function pushRow(rows, state, presentation, valueText, href, lineId, unitId) {
  const keyText = keyLabelFor(state, presentation, lineId, unitId)
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

        const domainEntry = domain.get(oblId)

        // Line-scoped obligations (presentsForEach pages) — one row per
        // record with a per-line Change URL. The group container
        // itself (commodityLine) hits this branch too; its records are
        // walked but each has a blank leaf and a null Change URL, so
        // the loop passes through without emitting rows or prompts.
        if (Array.isArray(impl.records)) {
          for (const record of impl.records) {
            const fulfilmentId = record.fulfilmentId
            if (!fulfilmentId) continue
            // Unit-scoped records carry a composite key `line/unit`;
            // line-scoped records carry just `line`. Split so the
            // per-unit variants get correct URLs + display labels.
            const isUnitScoped = obligation.within?.id === unitRecord.id
            const [lineId, unitId] = isUnitScoped
              ? fulfilmentId.split('/')
              : [fulfilmentId, null]
            const leaf = stored?.[fulfilmentId]
            const href = hrefForChange(oblId, lineId, unitId)
            const mandatory = isMandatoryOnRecord(obligation, impl, record)
            if (isBlankValue(leaf)) {
              if (mandatory && href) {
                pushPrompt(prompts, state, presentation, href, lineId, unitId)
              }
              continue
            }
            // Address structural-completeness prompt — the leaf has
            // some value, but a required sub-field is blank. Under
            // interpretation A on addressBlock this is caught here,
            // not at page save. The only line-scoped address today
            // is permanentAddress (composite key `line/unit`); the
            // prompt uses ordinal labels for both the line and the
            // unit within it.
            if (
              mandatory &&
              domainEntry?.type === 'address' &&
              typeof domainEntry.isComplete === 'function' &&
              !domainEntry.isComplete(leaf)
            ) {
              pushAddressUnitPrompt(prompts, state, fulfilmentId)
              continue
            }
            pushRow(
              rows,
              state,
              presentation,
              formatSingle(leaf, obligation),
              href,
              lineId,
              unitId
            )
          }
          continue
        }

        // Singleton case — one row per obligation.
        const href = hrefForChange(oblId, null, null)
        const mandatory =
          (obligation.status ?? impl.status ?? 'mandatory') === 'mandatory'
        if (isBlankValue(stored)) {
          if (mandatory && href) {
            pushPrompt(prompts, state, presentation, href, null, null)
          }
          continue
        }
        // Address structural-completeness prompt (singleton). Any
        // depth-1 address block whose stored value is present but
        // missing required sub-fields renders as a "Complete the …
        // address" prompt with a Change link to the address page.
        if (
          mandatory &&
          href &&
          domainEntry?.type === 'address' &&
          typeof domainEntry.isComplete === 'function' &&
          !domainEntry.isComplete(stored)
        ) {
          prompts.push({
            text: t('cya.promptCompleteAddress', {
              label: presentation.pageTitle
            }),
            href,
            because: []
          })
          continue
        }
        pushRow(
          rows,
          state,
          presentation,
          formatSingle(stored, obligation),
          href,
          null,
          null
        )
      }

      // Group-invariant prompts — routed by error code because the
      // error shape differs per invariant kind (see
      // engine/index.js#groupInvariantErrors).
      //
      //   - obligation.unitRecord.identifiersRequired — per-unit
      //     "at least one Animal Identifier" (V4 identifier rule).
      //     `instanceId` = `${lineId}/${unitId}`.
      //   - obligation.unitRecord.countMustMatchNumberOfAnimals —
      //     per-line "unit-record count equals numberOfAnimals" (V4
      //     "unit records ARE animals" reading). `instanceId` =
      //     `${lineId}` only; `expected` + `actual` on the error.
      //   - obligation.accompanyingDocument.allOrNothing — one
      //     notification-level prompt when the block is partial.
      for (const err of groupInvariantErrorsForState(state)) {
        if (err.code === 'obligation.unitRecord.identifiersRequired') {
          const [lineId, unitId] = err.instanceId.split('/')
          if (!lineId || !unitId) continue
          prompts.push({
            text: t('cya.promptGroupInvariant', {
              lineN: ordinalOfLineId(state, lineId),
              unitN: ordinalOfUnitId(state, lineId, unitId)
            }),
            href: `${BASE}/lines/${lineId}/units`,
            because: []
          })
        } else if (
          err.code === 'obligation.unitRecord.countMustMatchNumberOfAnimals'
        ) {
          const lineId = err.instanceId
          prompts.push({
            text: t('cya.promptUnitCountMismatch', {
              lineN: ordinalOfLineId(state, lineId),
              expected: err.expected,
              actual: err.actual
            }),
            href: `${BASE}/lines/${lineId}/units`,
            because: []
          })
        } else if (
          err.code === 'obligation.accompanyingDocument.allOrNothing'
        ) {
          prompts.push({
            text: t('cya.promptAccompanyingDocumentPartial'),
            href: `${BASE}/pages/accompanying-documents`,
            because: []
          })
        }
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
