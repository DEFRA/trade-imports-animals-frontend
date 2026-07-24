import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import {
  countryOfOrigin,
  internalReferenceNumber,
  regionCode,
  regionCodeRequirement
} from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('origin', [
  scalar({ field: 'countryOfOrigin', obligation: countryOfOrigin }),
  scalar({
    field: 'regionOfOriginCodeRequirement',
    obligation: regionCodeRequirement
  }),
  scalar({ field: 'regionOfOriginCode', obligation: regionCode }),
  scalar({
    field: 'internalReferenceNumber',
    obligation: internalReferenceNumber
  })
])
