import { FULFILLED, IN_PROGRESS } from '../flow-eval/index.js'

/**
 * The hub's govuk-tag status shapes (spike-a parity): Completed renders
 * plain text, everything else a coloured tag.
 */

export const tagged = (text, classes) => ({ tag: { text, classes } })

/** Spike-a's groupTag: Completed plain text, else a coloured tag. */
export const groupStatusTag = (status, labels) => {
  if (status === FULFILLED) return { text: labels.fulfilled }
  if (status === IN_PROGRESS) {
    return tagged(labels.inProgress, 'govuk-tag--light-blue')
  }
  return tagged(labels.notStarted, 'govuk-tag--grey')
}

/** Spike-a's statusTag for the add-on picker row (blue tags). */
export const pageStatusTag = (status, labels) => {
  if (status === FULFILLED) return { text: labels.fulfilled }
  if (status === IN_PROGRESS) {
    return tagged(labels.incomplete, 'govuk-tag--blue')
  }
  return tagged(labels.notStarted, 'govuk-tag--blue')
}
