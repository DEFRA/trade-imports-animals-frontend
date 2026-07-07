/**
 * `vehiclePhoto` is `renderOnly`: presented but never stored. The commit
 * contract test relies on the flag to exclude it from the
 * "committed == collects" check.
 */
export const registration = { id: 'registration' }
export const make = { id: 'make' }
export const model = { id: 'model' }
export const year = { id: 'year' }
export const estimatedValue = { id: 'estimatedValue' }
export const vehiclePhoto = { id: 'vehiclePhoto', renderOnly: true }

export const obligations = [
  registration,
  make,
  model,
  year,
  estimatedValue,
  vehiclePhoto
]
