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

export function hubViewModel(quote) {
  const live = contract.applicableSteps(quote)
  const items = grouped.groups.map((group) => {
    const liveIds = group.stepIds.filter((id) => live.includes(id))
    const statuses = liveIds.map((id) => contract.status(quote, id, grouped))
    return {
      title: { text: group.title },
      hint: { text: liveIds.map((id) => contract.stepTitle(id)).join(', ') },
      href: `${BASE}/${quote.id}/${group.stepIds[0]}`,
      status: groupTag(statuses)
    }
  })
  // Add-ons sit outside the groups: a selection task plus one task per chosen add-on.
  items.push({
    title: { text: contract.stepTitle('addons') },
    href: `${BASE}/${quote.id}/addons`,
    status: statusTag(contract.status(quote, 'addons', grouped))
  })
  items.push(...addonHubItems(quote, addonStepPath))
  items.push(getYourQuoteItem(quote))
  const completedCount = grouped.groups.filter((group) =>
    group.stepIds
      .filter((id) => live.includes(id))
      .every((id) => contract.status(quote, id, grouped) === 'complete')
  ).length
  return { items, completedCount, totalCount: grouped.groups.length }
}
