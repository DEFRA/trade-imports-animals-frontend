import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { cph } from '../../../../obligations/index.js'

export const evaluationBindings = feature('cph-number', [
  scalar({ field: 'countyParishHoldingCph', obligation: cph })
])
