import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { purposeInInternalMarket } from '../../../../obligations/index.js'

export const evaluationBindings = feature('import-purpose', [
  scalar({
    field: 'purposeInInternalMarket',
    obligation: purposeInInternalMarket
  })
])
