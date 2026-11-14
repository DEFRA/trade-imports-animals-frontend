import { AMEND, DRAFT } from '../../../../../engine/persistence/records.js'
import { writesBlockedError } from '../../writes-blocked-error.js'
import { journeys } from './state.js'

export const assertWritable = (journey) => {
  if (journey.status !== DRAFT && journey.status !== AMEND) {
    throw writesBlockedError(journey.id, journey.status)
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
