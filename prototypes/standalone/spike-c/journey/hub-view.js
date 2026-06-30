import { contract } from '../runtime/contract/index.js'
import { addonHubItems } from '../lib/addons/index.js'
import { BASE, grouped } from './config.js'
import { addonStepPath } from './paths.js'

/**
 * The hub task-list view model: turns the live journey state into govukTaskList
 * items, with status tags per task and per group, the add-on fan-out tasks and
 * the closing "Get your quote" item.
 */

function statusTag(status) {
  if (status === 'complete') {
    return { text: 'Completed' }
  }
  if (status === 'cannot-start') {
    return {
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    }
  }
  if (status === 'not-started') {
    return { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
  }
  return { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
}

function groupTag(statuses) {
  if (statuses.every((status) => status === 'complete')) {
    return { text: 'Completed' }
  }
  if (
    statuses.some((status) => status === 'complete' || status === 'partial')
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

const isGroupComplete = (statuses) =>
  statuses.every((status) => status === 'complete')

const addonsSelectionItem = (quote) => ({
  title: { text: contract.stepTitle('addons') },
  href: `${BASE}/${quote.id}/addons`,
  status: statusTag(contract.status(quote, 'addons', grouped))
})

// Build one group's task-list item and capture its per-step statuses so the
// completed-group count and the group tag come from the same derivation.
const groupView = (quote, group, live) => {
  const liveIds = liveStepIds(group, live)
  const statuses = liveIds.map((stepId) =>
    contract.status(quote, stepId, grouped)
  )
  return {
    statuses,
    item: {
      title: { text: group.title },
      hint: {
        text: liveIds.map((stepId) => contract.stepTitle(stepId)).join(', ')
      },
      href: `${BASE}/${quote.id}/${group.stepIds[0]}`,
      status: groupTag(statuses)
    }
  }
}

export function hubViewModel(quote) {
  const live = contract.applicableSteps(quote)
  const groupViews = grouped.groups.map((group) =>
    groupView(quote, group, live)
  )
  const items = [
    ...groupViews.map((view) => view.item),
    addonsSelectionItem(quote),
    ...addonHubItems(quote, addonStepPath),
    getYourQuoteItem(quote)
  ]
  const completedCount = groupViews.filter((view) =>
    isGroupComplete(view.statuses)
  ).length
  return { items, completedCount, totalCount: grouped.groups.length }
}
