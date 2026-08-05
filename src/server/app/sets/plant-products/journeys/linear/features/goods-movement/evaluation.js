import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  commonTransitConvention,
  movementReferenceNumber,
  usingGvms
} from '../../../../obligations/index.js'

export const evaluationBindings = feature('goods-movement', [
  scalar({
    field: 'commonTransitConvention',
    obligation: commonTransitConvention
  }),
  scalar({
    field: 'movementReferenceNumber',
    obligation: movementReferenceNumber
  }),
  scalar({
    field: 'usingGvms',
    obligation: usingGvms,
    convert: (value) => {
      if (typeof value === 'boolean') {
        return value
      }
      return value === 'yes'
    }
  })
])
