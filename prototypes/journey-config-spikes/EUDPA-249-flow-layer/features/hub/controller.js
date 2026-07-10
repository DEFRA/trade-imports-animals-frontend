/**
 * hub-controller — renders the task list.
 *
 * Every subsection is one row. The status tag reflects containerStatus
 * on that subsection. Clicking a row jumps to the first unfulfilled
 * page in the subsection (or the first applicable page as a fallback).
 */

import { sections, statusOfContainer, statusOfJourney } from '../../contract.js'
import { readState } from '../../lib/state.js'
import {
  firstApplicablePage,
  firstUnfulfilledPage,
  STATUSES
} from '../../engine/index.js'
import { commodityLine } from '../../obligations/obligations.js'
import { t } from '../../lib/i18n.js'
import { chrome } from '../../lib/chrome.js'

const BASE = '/prototype/eudpa-249'

// Status → { text, classes }. `text` resolves via t() at render time
// (inside statusTagFor); the classes stay hard-coded because they are
// GDS component styling, not user-facing copy.
const STATUS_CLASSES = {
  [STATUSES.NOT_APPLICABLE]: 'govuk-tag--grey',
  [STATUSES.NOT_STARTED]: 'govuk-tag--blue',
  [STATUSES.IN_PROGRESS]: 'govuk-tag--light-blue',
  [STATUSES.FULFILLED]: '',
  [STATUSES.SUBMITTED]: 'govuk-tag--green'
}

const STATUS_TEXT_KEY = {
  [STATUSES.NOT_APPLICABLE]: 'hub.status.notApplicable',
  [STATUSES.NOT_STARTED]: 'hub.status.notStarted',
  [STATUSES.IN_PROGRESS]: 'hub.status.inProgress',
  [STATUSES.FULFILLED]: 'hub.status.completed',
  [STATUSES.SUBMITTED]: 'hub.status.submitted'
}

function statusTagFor(status) {
  const key = STATUS_TEXT_KEY[status]
  if (!key) return { text: status }
  return { text: t(key), classes: STATUS_CLASSES[status] }
}

const PROGRESS_KEY = {
  [STATUSES.NOT_STARTED]: 'hub.progress.notStarted',
  [STATUSES.FULFILLED]: 'hub.progress.fulfilled'
}

function firstNavigablePage(subsection, state) {
  return (
    firstUnfulfilledPage(subsection, state) ?? firstApplicablePage(subsection)
  )
}

function linesManageStatus(state) {
  // "Add commodity lines" is the user's ADD step, not the fill step.
  // Zero lines = Not started; ≥ 1 line = Completed. The per-line
  // details (commodity code, species, counts) live under the
  // separate `commodity-lines-details` subsection and drive its own
  // rollup — this subsection only measures "has the user added a
  // line yet".
  const records = state.obligations?.[commodityLine.id]?.records ?? []
  return records.length === 0 ? STATUSES.NOT_STARTED : STATUSES.FULFILLED
}

function subsectionHref(subsection, state) {
  // All commodity-lines subsections (line management, per-line
  // details, and depth-2 per-unit records) route into the bespoke
  // `/lines` list — the flow-major "one page per obligation across
  // all lines" URLs have been retired in favour of the line-major
  // `/lines/{id}/{page}` and `/lines/{id}/units/{unitId}/{page}`
  // shapes (see routes.js). Users pick a line from the list and
  // walk THAT line's pages sequentially, then click into its
  // Manage animals link for the per-unit pages.
  if (
    subsection.id === 'commodity-lines-manage' ||
    subsection.id === 'commodity-lines-details' ||
    subsection.id === 'per-unit-records'
  ) {
    return `${BASE}/lines`
  }
  const page = firstNavigablePage(subsection, state)
  if (!page) return null
  return `${BASE}/pages/${page.page}`
}

export const hubController = {
  get: {
    handler(request, h) {
      const state = readState(request)
      const modelSections = sections().map((section) => {
        const items = (section.children ?? []).map((subsection) => {
          const isLinesManage = subsection.id === 'commodity-lines-manage'
          // The lines-manage subsection is the entry point to the
          // bespoke commodity-lines UX; derive its status from the
          // number of line records instead of rolling up the read-only
          // intro page, so it doesn't parrot NA.
          const status = isLinesManage
            ? linesManageStatus(state)
            : statusOfContainer(subsection, state)
          const href = subsectionHref(subsection, state)
          const item = {
            title: { text: t(subsection.titleKey) },
            status: { tag: statusTagFor(status) }
          }
          // Always let lines-manage be clickable; other subsections
          // stay locked when NA.
          if (href && (isLinesManage || status !== STATUSES.NOT_APPLICABLE)) {
            item.href = href
          }
          return item
        })
        return { title: t(section.titleKey), items }
      })

      const overall = statusOfJourney(state)
      const progressLine = t(PROGRESS_KEY[overall] ?? 'hub.progress.inProgress')

      return h.view('features/hub/template', {
        chrome: chrome(),
        layout: 'layout.njk',
        pageTitle: t('hub.pageTitle'),
        heading: t('hub.heading'),
        lead: t('hub.lead'),
        progressLine,
        sections: modelSections,
        cyaHref: `${BASE}/check-your-answers`,
        cyaLinkText: t('hub.checkYourAnswersLink'),
        resetHref: `${BASE}/reset`,
        resetButtonText: t('hub.resetButton'),
        crumb: request.plugins?.crumb ?? null,
        breadcrumbs: [{ text: t('chrome.taskList') }]
      })
    }
  }
}
