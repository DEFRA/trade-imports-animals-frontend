import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { reasonForImport } from '../../../../obligations/index.js'

export const evaluationBindings = feature('import-reason', [
  scalar({ field: 'reasonForImport', obligation: reasonForImport })
])
