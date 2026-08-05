import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { poApprovedReferenceNumber } from '../../../../obligations/index.js'

export const evaluationBindings = feature('system', [
  scalar({
    field: 'poApprovedReferenceNumber',
    obligation: poApprovedReferenceNumber
  })
])
