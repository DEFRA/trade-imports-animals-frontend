import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { reasonForImport } from '../../../../obligations/index.js'

export const evaluationBindings = feature('purpose', [
  scalar({ field: 'reasonForImport', obligation: reasonForImport })
])
