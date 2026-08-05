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

const TWO_DIGIT_WIDTH = 2

const twoDigits = (value) => String(value).padStart(TWO_DIGIT_WIDTH, '0')

const toIsoDate = (value) => {
  if (value === null || typeof value === 'string') {
    return value
  }
  const { day, month, year } = value
  return `${year}-${twoDigits(month)}-${twoDigits(day)}`
}

const toTime = (value) => {
  if (value === null || typeof value === 'string') {
    return value
  }
  const { hour, minute } = value
  return `${twoDigits(hour)}:${twoDigits(minute)}`
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
