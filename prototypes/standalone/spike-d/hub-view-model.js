import { addonHubItems } from './lib/addons/index.js'
import { contract } from './runtime/index.js'
import { BASE, grouped, addonStepPath } from './journey-shape.js'
import { statusTag, groupTag, getYourQuoteItem } from './status-tags.js'

/** Assemble the hub (task list) view model from the journey shape + answers. */

const STATUS_COMPLETE = 'complete'

const liveStepIds = (group, live) =>
  group.stepIds.filter((id) => live.includes(id))

const groupToHubItem = (quote, live) => (group) => {
  const liveIds = liveStepIds(group, live)
  const statuses = liveIds.map((id) => contract.status(quote, id, grouped))
  return {
    title: { text: group.title },
    hint: { text: liveIds.map((id) => contract.stepTitle(id)).join(', ') },
    href: `${BASE}/${quote.id}/${group.stepIds[0]}`,
    status: groupTag(statuses)
  }
}

// Add-ons sit outside the groups: a selection task plus one task per chosen add-on.
const addonSelectionItem = (quote) => ({
  title: { text: contract.stepTitle('addons') },
  href: `${BASE}/${quote.id}/addons`,
  status: statusTag(contract.status(quote, 'addons', grouped))
})

const countCompletedGroups = (quote, live) =>
  grouped.groups.filter((group) =>
    liveStepIds(group, live).every(
      (id) => contract.status(quote, id, grouped) === STATUS_COMPLETE
    )
  ).length

export function hubViewModel(quote) {
  const live = contract.applicableSteps(quote)
  const items = [
    ...grouped.groups.map(groupToHubItem(quote, live)),
    addonSelectionItem(quote),
    ...addonHubItems(quote, addonStepPath),
    getYourQuoteItem(quote)
  ]
  return {
    items,
    completedCount: countCompletedGroups(quote, live),
    totalCount: grouped.groups.length
  }
}
