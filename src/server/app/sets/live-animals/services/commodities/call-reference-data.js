import Boom from '@hapi/boom'
import { isStubMode } from '../../../../../common/services/mode.js'

const DATASET = 'commodities'

export const callReferenceData = async ({ stubCall, realCall }) => {
  if (isStubMode()) {
    return stubCall()
  }
  try {
    return await realCall()
  } catch (err) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: DATASET,
      cause: err
    })
  }
}
