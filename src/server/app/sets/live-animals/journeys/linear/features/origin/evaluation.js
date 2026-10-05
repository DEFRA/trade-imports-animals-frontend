import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  countryOfOrigin,
  countryOfOriginSubdivisionCode,
  internalReferenceNumber,
  regionCode,
  regionCodeRequirement
} from '../../../../obligations/index.js'

export const evaluationBindings = feature('origin', [
  scalar({ field: 'countryOfOrigin', obligation: countryOfOrigin }),
  scalar({
    field: 'countryOfOriginSubdivisionCode',
    obligation: countryOfOriginSubdivisionCode
  }),
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
