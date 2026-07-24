import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import {
  poApprovedReferenceNumber,
  responsiblePersonForLoad
} from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('system', [
  scalar({
    field: 'poApprovedReferenceNumber',
    obligation: poApprovedReferenceNumber
  }),
  scalar({
    field: 'responsiblePersonForLoad',
    obligation: responsiblePersonForLoad
  })
])
