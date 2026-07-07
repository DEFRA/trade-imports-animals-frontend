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

/**
 * The commercial-vs-private split (V4, c-012). The stored value is the V4
 * label itself — the commercial and private transporter obligations (next
 * two increments) activate on 'Commercial transporter' / 'Private
 * transporter' verbatim.
 */
export const transporterType = { id: 'transporterType', required: true }

/**
 * The commercial spoke of the c-012 type split — owed only when the
 * transporter type is 'Commercial transporter' (the stored V4 label,
 * verbatim). The answer is a copied { name, address, approvalNumber }
 * object (c-020). Leaving the commercial branch wipes any saved
 * transporter (spec: activatedBy + wipeOnExit).
 */
export const commercialTransporter = {
  id: 'commercialTransporter',
  required: true,
  activatedBy: {
    obligation: transporterType,
    equals: 'Commercial transporter'
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
  commercialTransporter
]
