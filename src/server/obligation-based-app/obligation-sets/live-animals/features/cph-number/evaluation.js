import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import { cph } from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('cph-number', [
  scalar({ field: 'countyParishHoldingCph', obligation: cph })
])
