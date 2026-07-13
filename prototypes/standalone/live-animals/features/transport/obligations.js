export const portOfEntry = { id: 'portOfEntry', required: true }

export const arrivalDateAtPort = { id: 'arrivalDateAtPort', required: true }

export const meansOfTransport = { id: 'meansOfTransport', required: true }

export const transportIdentification = {
  id: 'transportIdentification',
  required: true
}

export const transportDocumentReference = {
  id: 'transportDocumentReference',
  required: true
}

export const transitedCountries = {
  id: 'transitedCountries',
  required: true,
  activatedBy: {
    obligation: meansOfTransport,
    includes: ['Railway', 'Road Vehicle']
  },
  wipeOnExit: true
}

export const transporterType = { id: 'transporterType', required: true }

export const commercialTransporter = {
  id: 'commercialTransporter',
  required: true,
  activatedBy: {
    obligation: transporterType,
    equals: 'Commercial'
  },
  wipeOnExit: true
}

export const privateTransporter = {
  id: 'privateTransporter',
  required: true,
  activatedBy: {
    obligation: transporterType,
    equals: 'Private'
  },
  wipeOnExit: true
}

export const obligations = [
  portOfEntry,
  arrivalDateAtPort,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  transporterType,
  commercialTransporter,
  privateTransporter
]
