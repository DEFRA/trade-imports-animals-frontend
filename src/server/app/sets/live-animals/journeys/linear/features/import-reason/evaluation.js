import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  destinationCountry,
  exitDate,
  portOfExit,
  purposeInInternalMarket,
  reasonForImport
} from '../../../../obligations/index.js'

export const evaluationBindings = feature('import-reason', [
  scalar({ field: 'reasonForImport', obligation: reasonForImport }),
  scalar({
    field: 'purposeInInternalMarket',
    obligation: purposeInInternalMarket
  }),
  scalar({ field: 'destinationCountry', obligation: destinationCountry }),
  scalar({ field: 'portOfExit', obligation: portOfExit }),
  scalar({ field: 'exitDate', obligation: exitDate })
])
