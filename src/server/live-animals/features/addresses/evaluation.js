import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import {
  consignee,
  consignor,
  importer,
  placeOfDestination,
  placeOfOrigin
} from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('addresses', [
  scalar({ field: 'placeOfOrigin', obligation: placeOfOrigin }),
  scalar({ field: 'consignor', obligation: consignor }),
  scalar({ field: 'consignee', obligation: consignee }),
  scalar({ field: 'importer', obligation: importer }),
  scalar({
    field: 'placeOfDestination',
    obligation: placeOfDestination
  })
])
