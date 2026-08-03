import { equalsGate } from '../../../../model/obligations/helpers/index.js'

const movementReferenceNumberReason = {
  code: 'obligation.movementReferenceNumber.applicable.becauseAddMrnNow',
  explanation:
    'movementReferenceNumber applies when commonTransitConvention is ADD_MRN_NOW'
}

export const commonTransitConvention = {
  id: '6abbe125-59ef-4e0f-ad24-196dbc114e7f',
  name: 'commonTransitConvention',
  status: 'mandatory'
}

// Purge-on-flip: leaving ADD_MRN_NOW takes the MRN out of scope, so the
// evaluator drops any previously stored value.
export const movementReferenceNumber = {
  id: 'bd573917-4a63-4888-9f21-1400142249d4',
  name: 'movementReferenceNumber',
  applyTo: equalsGate(
    commonTransitConvention,
    'ADD_MRN_NOW',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [movementReferenceNumberReason]
    },
    { inScope: false }
  )
}

export const usingGvms = {
  id: 'ffd473e1-7e09-4668-a9bb-3210eb64e573',
  name: 'usingGvms',
  status: 'mandatory'
}
