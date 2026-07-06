/**
 * Your vehicle — the obligations this feature owns. Pure data; imports
 * nothing outward.
 *
 * `vehiclePhoto` is `renderOnly`: the file input is presented but never
 * stored (spike parity). The commit contract test relies on this flag to
 * exclude it from the "committed == collects" check.
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
