import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import { reasonForImport } from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('import-reason', [
  scalar({ field: 'reasonForImport', obligation: reasonForImport })
])
