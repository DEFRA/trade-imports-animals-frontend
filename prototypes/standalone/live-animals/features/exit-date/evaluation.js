import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import { exitDate } from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('exit-date', [
  scalar({ field: 'exitDate', obligation: exitDate })
])
