import { isStubMode } from '../../../../../common/services/mode.js'
import { referenceDataUnavailable } from '../../../../services/reference-data/request.js'

const DATASET = 'commodities'

export const commoditiesFromStubOrReferenceData = async ({
  stubCall,
  realCall
}) => {
  if (isStubMode()) {
    return stubCall()
  }
  try {
    return await realCall()
  } catch (err) {
    throw referenceDataUnavailable(DATASET, err)
  }
}
