import { contract } from '../runtime/contract.js'
import { addonHubItems } from '../lib/addons/index.js'
import { BASE, grouped } from './config.js'
import { addonStepPath } from './links.js'

/**
 * The task-list hub view model and its status tags — turns the live applicable
 * steps + their statuses into the grouped task list the hub page renders, with
 * add-ons appended as their own tasks.
 */

const STATUS_COMPLETE = 'complete'
const STATUS_PARTIAL = 'partial'
const STATUS_NOT_STARTED = 'not-started'
const STATUS_CANNOT_START = 'cannot-start'
const ADDONS_STEP = 'addons'

function statusTag(status) {
  if (status === STATUS_COMPLETE) {
    return { text: 'Completed' }
  }
  if (status === STATUS_CANNOT_START) {
    return {
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    }
  }
  if (status === STATUS_NOT_STARTED) {
    return { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
  }
  return { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
}

function groupTag(statuses) {
  if (statuses.every((status) => status === STATUS_COMPLETE)) {
    return { text: 'Completed' }
  }
  if (
    statuses.some(
      (status) => status === STATUS_COMPLETE || status === STATUS_PARTIAL
    )
  ) {
    return { tag: { text: 'In progress', classes: 'govuk-tag--light-blue' } }
  }
  return { tag: { text: 'Not started', classes: 'govuk-tag--grey' } }
}

function getYourQuoteItem(quote) {
  const ready = contract.allComplete(quote)
  return {
    title: { text: 'Get your quote' },
    href: ready ? `${BASE}/${quote.id}/quote-summary` : undefined,
    status: ready
      ? { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
      : {
          text: 'Cannot start yet',
          classes: 'govuk-task-list__status--cannot-start-yet'
        }
  }
}

const liveStepIds = (group, live) =>
  group.stepIds.filter((stepId) => live.includes(stepId))

const liveStatuses = (quote, live, group) =>
  liveStepIds(group, live).map((stepId) =>
    contract.status(quote, stepId, grouped)
  )

const groupItem = (group, quote, live) => ({
  title: { text: group.title },
  hint: {
    text: liveStepIds(group, live)
      .map((stepId) => contract.stepTitle(stepId))
      .join(', ')
  },
  href: `${BASE}/${quote.id}/${group.stepIds[0]}`,
  status: groupTag(liveStatuses(quote, live, group))
})

// Add-ons sit outside the groups: a selection task plus one task per chosen add-on.
const addonsSelectionItem = (quote) => ({
  title: { text: contract.stepTitle(ADDONS_STEP) },
  href: `${BASE}/${quote.id}/addons`,
  status: statusTag(contract.status(quote, ADDONS_STEP, grouped))
})

const completedGroupCount = (quote, live) =>
  grouped.groups.filter((group) =>
    liveStatuses(quote, live, group).every(
      (status) => status === STATUS_COMPLETE
    )
  ).length

export function hubViewModel(quote) {
  const live = contract.applicableSteps(quote)
  const items = [
    ...grouped.groups.map((group) => groupItem(group, quote, live)),
    addonsSelectionItem(quote),
    ...addonHubItems(quote, addonStepPath),
    getYourQuoteItem(quote)
  ]
  return {
    items,
    completedCount: completedGroupCount(quote, live),
    totalCount: grouped.groups.length
  }
}
