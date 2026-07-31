import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { poApprovedReferenceNumber } from '../../../../../../model/obligations/obligations.js'

export const evaluationBindings = feature('system', [
  scalar({
    field: 'poApprovedReferenceNumber',
    obligation: poApprovedReferenceNumber
  })
])
