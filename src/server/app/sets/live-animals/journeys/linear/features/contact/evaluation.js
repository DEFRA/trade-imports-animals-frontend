import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { contactAddress } from '../../../../obligations/index.js'

export const evaluationBindings = feature('contact', [
  scalar({ field: 'contactAddress', obligation: contactAddress })
])
