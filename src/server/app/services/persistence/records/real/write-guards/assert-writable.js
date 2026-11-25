import { AMEND, DRAFT } from '../../../../../engine/persistence/records.js'
import { writesBlockedError } from '../../writes-blocked-error.js'

export const assertWritable = (journeyId, status) => {
  if (status !== DRAFT && status !== AMEND) {
    throw writesBlockedError(journeyId, status)
  }
}
