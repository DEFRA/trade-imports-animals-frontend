// All required fields here are "Mandatory to submit" (V4): required feeds the
// status roll-up; blank never blocks Save and Continue (enforcedAt=submit).
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

/**
 * Optional (V4 Mandatory cell says Optional; the Conditions cell's "required
 * when rail/road" clause carries an unresolved inline comment) but only in
 * scope for rail or road transport. Leaving that scope wipes any saved
 * countries (spec: activatedBy + wipeOnExit).
 */
export const transitedCountries = {
  id: 'transitedCountries',
  activatedBy: {
    obligation: meansOfTransport,
    includes: ['Railway', 'Road Vehicle']
  },
  wipeOnExit: true
}

export const obligations = [
  portOfEntry,
  arrivalDateAtPort,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries
]
