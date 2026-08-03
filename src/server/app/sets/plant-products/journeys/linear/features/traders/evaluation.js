import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  destinationAddressLine1,
  destinationAddressLine2,
  destinationAddressLine3,
  destinationCity,
  destinationCountry,
  destinationName,
  destinationPostcode,
  destinationSameAsConsignee,
  packerAddressLine1,
  packerAddressLine2,
  packerAddressLine3,
  packerCity,
  packerCountry,
  packerName,
  packerPostcode
} from '../../../../obligations/index.js'

export const evaluationBindings = feature('traders', [
  scalar({
    field: 'destinationSameAsConsignee',
    obligation: destinationSameAsConsignee
  }),
  scalar({ field: 'destinationName', obligation: destinationName }),
  scalar({
    field: 'destinationAddressLine1',
    obligation: destinationAddressLine1
  }),
  scalar({
    field: 'destinationAddressLine2',
    obligation: destinationAddressLine2
  }),
  scalar({
    field: 'destinationAddressLine3',
    obligation: destinationAddressLine3
  }),
  scalar({ field: 'destinationCity', obligation: destinationCity }),
  scalar({ field: 'destinationPostcode', obligation: destinationPostcode }),
  scalar({ field: 'destinationCountry', obligation: destinationCountry }),
  scalar({ field: 'packerName', obligation: packerName }),
  scalar({ field: 'packerAddressLine1', obligation: packerAddressLine1 }),
  scalar({ field: 'packerAddressLine2', obligation: packerAddressLine2 }),
  scalar({ field: 'packerAddressLine3', obligation: packerAddressLine3 }),
  scalar({ field: 'packerCity', obligation: packerCity }),
  scalar({ field: 'packerPostcode', obligation: packerPostcode }),
  scalar({ field: 'packerCountry', obligation: packerCountry })
])
