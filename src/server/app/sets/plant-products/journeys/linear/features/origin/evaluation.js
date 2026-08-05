import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  countryOfConsignment,
  countryOfOrigin,
  internalReference
} from '../../../../obligations/sections/origin.js'

export const evaluationBindings = feature('origin', [
  scalar({ field: 'countryOfOrigin', obligation: countryOfOrigin }),
  scalar({
    field: 'countryOfConsignment',
    obligation: countryOfConsignment
  }),
  scalar({ field: 'internalReference', obligation: internalReference })
])
