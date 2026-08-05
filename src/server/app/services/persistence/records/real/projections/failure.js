import { markRecoverableBackendError } from '../../errors.js'
import { logger } from '../logger.js'

export const throwProjectionFailure = (journeyId, failures) => {
  const failedProjections = failures.map(({ name }) => name)
  const error = markRecoverableBackendError(
    new AggregateError(
      failures.map(({ error: cause }) => cause),
      `Canonical fulfilment "${journeyId}" saved, but projection writes failed: ${failedProjections.join(', ')}`
    )
  )
  error.canonicalSaved = true
  error.journeyId = journeyId
  error.failedProjections = failedProjections
  logger.error(
    { err: error, journeyId, failedProjections },
    'Canonical fulfilment saved with projection failures'
  )
  throw error
}
