import Boom from '@hapi/boom'
import { isStubMode } from '../../../../../common/services/mode.js'
import { createLogger } from '../../../../../common/helpers/logging/logger.js'

const logger = createLogger()

const DATASET = 'commodities'

export const callReferenceData = async ({ stubCall, realCall, failureLog }) => {
  if (isStubMode()) {
    return stubCall()
  }
  try {
    return await realCall()
  } catch (err) {
    logger.warn({ err, dataset: DATASET }, failureLog)
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: DATASET,
      cause: err
    })
  }
}
