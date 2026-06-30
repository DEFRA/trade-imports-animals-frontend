import { contract } from '../runtime/contract.js'
import { addonHubItems } from '../lib/addons/index.js'
import { BASE, grouped } from './config.js'
import { addonStepPath } from './links.js'

/**
 * The task-list hub view model and its status tags — turns the live applicable
 * steps + their statuses into the grouped task list the hub page renders, with
 * add-ons appended as their own tasks.
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
  if (statuses.every((s) => s === 'complete')) {
    return { text: 'Completed' }
  }
  if (statuses.some((s) => s === 'complete' || s === 'partial')) {
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
