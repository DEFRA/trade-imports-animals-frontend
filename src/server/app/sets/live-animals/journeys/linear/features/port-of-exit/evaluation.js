import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { portOfExit } from '../../../../obligations/index.js'

export const evaluationBindings = feature('port-of-exit', [
  scalar({ field: 'portOfExit', obligation: portOfExit })
])
