import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'

export const assertWritable = (journeyId, status) => {
  if (status !== DRAFT && status !== AMEND) {
    const reason = status === SUBMITTED ? 'submitted' : status
    throw new Error(`Journey "${journeyId}" is ${reason} — writes blocked`)
  }
}
