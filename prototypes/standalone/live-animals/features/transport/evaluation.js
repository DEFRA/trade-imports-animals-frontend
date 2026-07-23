import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import {
  arrivalDateAtPort,
  commercialTransporter,
  meansOfTransport,
  portOfEntry,
  privateTransporter,
  transitedCountries,
  transportDocumentReference,
  transportIdentification,
  transporterType
} from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('transport', [
  scalar({ field: 'transporterType', obligation: transporterType }),
  scalar({
    field: 'commercialTransporter',
    obligation: commercialTransporter
  }),
  scalar({ field: 'privateTransporter', obligation: privateTransporter }),
  scalar({ field: 'meansOfTransport', obligation: meansOfTransport }),
  scalar({
    field: 'transportIdentification',
    obligation: transportIdentification
  }),
  scalar({
    field: 'transportDocumentReference',
    obligation: transportDocumentReference
  }),
  scalar({ field: 'transitedCountries', obligation: transitedCountries }),
  scalar({ field: 'arrivalDateAtPort', obligation: arrivalDateAtPort }),
  scalar({ field: 'portOfEntry', obligation: portOfEntry })
])
