import {
  feature,
  grouped,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  arrivalDate,
  arrivalTime,
  borderControlPost,
  containerNumber,
  containers,
  inspectionPremises,
  meansOfTransport,
  officialSeal,
  sealNumber,
  transportDocumentReference,
  transportIdentification,
  usesContainers
} from '../../../../obligations/index.js'

const toIsoDate = (value) => {
  if (typeof value === 'string') return value
  const { day, month, year } = value
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const toTime = (value) => {
  if (typeof value === 'string') return value
  const { hour, minute } = value
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const container = {
  field: 'containers',
  token: 'container',
  obligation: containers
}

const containerLeaf = (field, obligation) =>
  grouped({ field, obligation, groups: [container] })

export const evaluationBindings = feature('transport', [
  scalar({ field: 'borderControlPost', obligation: borderControlPost }),
  scalar({ field: 'inspectionPremises', obligation: inspectionPremises }),
  scalar({ field: 'meansOfTransport', obligation: meansOfTransport }),
  scalar({
    field: 'transportIdentification',
    obligation: transportIdentification
  }),
  scalar({
    field: 'transportDocumentReference',
    obligation: transportDocumentReference
  }),
  scalar({ field: 'arrivalDate', obligation: arrivalDate, convert: toIsoDate }),
  scalar({ field: 'arrivalTime', obligation: arrivalTime, convert: toTime }),
  scalar({ field: 'usesContainers', obligation: usesContainers }),
  containerLeaf('containerNumber', containerNumber),
  containerLeaf('sealNumber', sealNumber),
  containerLeaf('officialSeal', officialSeal)
])
