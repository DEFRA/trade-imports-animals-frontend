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

const BASE = '/prototype/eudpa-249'

const STATUS_TAG = {
  [STATUSES.NOT_APPLICABLE]: {
    text: 'Not applicable',
    classes: 'govuk-tag--grey'
  },
  [STATUSES.NOT_STARTED]: { text: 'Not started', classes: 'govuk-tag--blue' },
  [STATUSES.IN_PROGRESS]: {
    text: 'In progress',
    classes: 'govuk-tag--light-blue'
  },
  [STATUSES.FULFILLED]: { text: 'Completed', classes: '' },
  [STATUSES.SUBMITTED]: { text: 'Submitted', classes: 'govuk-tag--green' }
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
  // Commodity-lines-manage subsection has a special href to the bespoke
  // /lines controller — resolved before falling into firstNavigablePage,
  // because the subsection's only child is a read-only intro page that
  // firstNavigablePage would rightly discard.
  if (subsection.id === 'commodity-lines-manage') {
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
            status: { tag: STATUS_TAG[status] ?? { text: status } }
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
      const progressLine =
        overall === STATUSES.NOT_STARTED
          ? 'You have not started this journey yet.'
          : overall === STATUSES.FULFILLED
            ? 'All required sections are complete.'
            : 'You are part-way through this journey.'

      return h.view('features/hub/template', {
        layout: 'layout.njk',
        pageTitle: 'Task list',
        heading: 'Live animals — EUDPA-249 flow-layer prototype',
        lead: 'Complete each section. Your progress is saved as you go.',
        progressLine,
        sections: modelSections,
        cyaHref: `${BASE}/check-your-answers`,
        resetHref: `${BASE}/reset`,
        crumb: request.plugins?.crumb ?? null,
        breadcrumbs: [{ text: 'Task list' }]
      })
    }
  }
}
