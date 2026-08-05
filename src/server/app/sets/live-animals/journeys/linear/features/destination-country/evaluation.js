import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { destinationCountry } from '../../../../obligations/index.js'

export const evaluationBindings = feature('destination-country', [
  scalar({ field: 'destinationCountry', obligation: destinationCountry })
])
