import {
  AMEND,
  DRAFT,
  isSubmittedStatus
} from '../../../../../engine/persistence/records.js'
import { journeys } from './state.js'

export const assertWritable = (journey) => {
  if (journey.status !== DRAFT && journey.status !== AMEND) {
    const reason = isSubmittedStatus(journey.status)
      ? 'submitted'
      : journey.status
    throw new Error(`Journey "${journey.id}" is ${reason} — writes blocked`)
  }
}

export const loadWritable = (journeyId) => {
  const journey = journeys().get(journeyId)
  if (!journey) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  assertWritable(journey)
  return journey
}
