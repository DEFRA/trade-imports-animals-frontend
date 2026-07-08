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

function subsectionHref(subsection, state) {
  const page = firstNavigablePage(subsection, state)
  if (!page) return null
  // Commodity-lines-manage subsection has a special href to the bespoke
  // /lines controller instead of the intro page.
  if (subsection.id === 'commodity-lines-manage') {
    return `${BASE}/lines`
  }
  return `${BASE}/pages/${page.page}`
}

export const hubController = {
  get: {
    handler(request, h) {
      const state = readState(request)
      const modelSections = sections().map((section) => {
        const items = (section.children ?? []).map((subsection) => {
          const status = statusOfContainer(subsection, state)
          const href = subsectionHref(subsection, state)
          const item = {
            title: { text: subsection.title },
            status: { tag: STATUS_TAG[status] ?? { text: status } }
          }
          if (href && status !== STATUSES.NOT_APPLICABLE) {
            item.href = href
          }
          return item
        })
        return { title: section.title, items }
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
