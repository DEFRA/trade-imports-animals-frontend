import { isSubmittedStatus } from '../../../engine/persistence/records.js'

export const writesBlockedError = (journeyId, status) => {
  const reason = isSubmittedStatus(status) ? 'submitted' : status
  return new Error(`Journey "${journeyId}" is ${reason} — writes blocked`)
}
