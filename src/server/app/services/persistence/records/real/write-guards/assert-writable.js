import {
  AMEND,
  DRAFT,
  isSubmittedStatus
} from '../../../../../engine/persistence/records.js'

export const assertWritable = (journeyId, status) => {
  if (status !== DRAFT && status !== AMEND) {
    const reason = isSubmittedStatus(status) ? 'submitted' : status
    throw new Error(`Journey "${journeyId}" is ${reason} — writes blocked`)
  }
}
