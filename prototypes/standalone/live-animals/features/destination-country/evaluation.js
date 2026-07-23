import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import { destinationCountry } from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('destination-country', [
  scalar({ field: 'destinationCountry', obligation: destinationCountry })
])
