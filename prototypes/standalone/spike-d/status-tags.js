import { contract } from './runtime/index.js'
import { BASE } from './journey-shape.js'

/** Task-list status tags for the hub. */

const STATUS_COMPLETE = 'complete'
const STATUS_CANNOT_START = 'cannot-start'
const STATUS_NOT_STARTED = 'not-started'
const STATUS_PARTIAL = 'partial'

const CANNOT_START_TAG = {
  text: 'Cannot start yet',
  classes: 'govuk-task-list__status--cannot-start-yet'
}

export function statusTag(status) {
  if (status === STATUS_COMPLETE) {
    return { text: 'Completed' }
  }
  if (status === STATUS_CANNOT_START) {
    return CANNOT_START_TAG
  }
  if (status === STATUS_NOT_STARTED) {
    return { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
  }
  return { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
}

export function groupTag(statuses) {
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

export function getYourQuoteItem(quote) {
  const ready = contract.allComplete(quote)
  return {
    title: { text: 'Get your quote' },
    href: ready ? `${BASE}/${quote.id}/quote-summary` : undefined,
    status: ready
      ? { tag: { text: 'Not started', classes: 'govuk-tag--blue' } }
      : CANNOT_START_TAG
  }
}
