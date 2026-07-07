// Both fields are "Mandatory to submit" (V4): required feeds the status
// roll-up; blank never blocks Save and Continue (enforcedAt=submit).
export const portOfEntry = { id: 'portOfEntry', required: true }

export const arrivalDateAtPort = { id: 'arrivalDateAtPort', required: true }

export const obligations = [portOfEntry, arrivalDateAtPort]
