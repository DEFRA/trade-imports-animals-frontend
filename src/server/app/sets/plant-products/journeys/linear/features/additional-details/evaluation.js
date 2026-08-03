import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  grossVolume,
  grossVolumeUnit,
  totalGrossWeight
} from '../../../../obligations/index.js'

export const evaluationBindings = feature('additional-details', [
  scalar({ field: 'totalGrossWeight', obligation: totalGrossWeight }),
  scalar({ field: 'grossVolume', obligation: grossVolume }),
  scalar({ field: 'grossVolumeUnit', obligation: grossVolumeUnit })
])
