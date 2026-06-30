import { addonHubItems } from '../lib/addons.js'
import { contract } from '../runtime/selectors.js'
import { BASE, grouped, addonStepPath } from './config.js'

/**
 * The task-list hub view model: maps the journey's groups and add-ons onto the
 * GOV.UK task-list items, deriving each task's status tag from the contract.
 */

const STATUS = Object.freeze({
  COMPLETE: 'complete',
  CANNOT_START: 'cannot-start',
  NOT_STARTED: 'not-started',
  PARTIAL: 'partial'
})

function statusTag(status) {
  if (status === STATUS.COMPLETE) {
    return { text: 'Completed' }
  }
  if (status === STATUS.CANNOT_START) {
    return {
      text: 'Cannot start yet',
      classes: 'govuk-task-list__status--cannot-start-yet'
    }
  }
  if (status === STATUS.NOT_STARTED) {
    return { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
  }
  return { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
}

function groupTag(statuses) {
  if (statuses.every((status) => status === STATUS.COMPLETE)) {
    return { text: 'Completed' }
  }
  if (
    statuses.some(
      (status) => status === STATUS.COMPLETE || status === STATUS.PARTIAL
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

function groupItem(quote, group, live) {
  const liveIds = group.stepIds.filter((id) => live.includes(id))
  const statuses = liveIds.map((id) => contract.status(quote, id, grouped))
  return {
    title: { text: group.title },
    hint: { text: liveIds.map((id) => contract.stepTitle(id)).join(', ') },
    href: `${BASE}/${quote.id}/${group.stepIds[0]}`,
    status: groupTag(statuses)
  }
}

function isGroupComplete(quote, group, live) {
  return group.stepIds
    .filter((id) => live.includes(id))
    .every((id) => contract.status(quote, id, grouped) === STATUS.COMPLETE)
}

export function hubViewModel(quote) {
  const live = contract.applicableSteps(quote)
  const items = grouped.groups.map((group) => groupItem(quote, group, live))
  // Add-ons sit outside the groups: a selection task plus one task per chosen add-on.
  items.push({
    title: { text: contract.stepTitle('addons') },
    href: `${BASE}/${quote.id}/addons`,
    status: statusTag(contract.status(quote, 'addons', grouped))
  })
  items.push(...addonHubItems(quote, addonStepPath))
  items.push(getYourQuoteItem(quote))
  const completedCount = grouped.groups.filter((group) =>
    isGroupComplete(quote, group, live)
  ).length
  return { items, completedCount, totalCount: grouped.groups.length }
}
