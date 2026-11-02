import { isStubMode } from '../../../../../common/services/mode.js'
import { referenceDataUnavailable } from '../../../../services/reference-data/request.js'

export const fromStubOrReferenceData = async ({
  stubCall,
  realCall,
  dataset
}) => {
  if (isStubMode()) {
    return stubCall()
  }
  try {
    return await realCall()
  } catch (err) {
    throw referenceDataUnavailable(dataset, err)
  }
}
