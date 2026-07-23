import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import { portOfExit } from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('port-of-exit', [
  scalar({ field: 'portOfExit', obligation: portOfExit })
])
