import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import { contactAddress } from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('contact', [
  scalar({ field: 'contactAddress', obligation: contactAddress })
])
