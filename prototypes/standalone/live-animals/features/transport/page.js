/**
 * Import-free data leaf — importing a controller here (or in flow.js)
 * creates the load cycle flow -> controller -> engine -> status -> flow
 * and leaves `sections` undefined at boot.
 */
export const portOfEntryPage = {
  id: 'port-of-entry',
  slug: 'port-of-entry'
}

export const transportDetailsPage = {
  id: 'transport-details',
  slug: 'transport-details'
}

export const transportersPage = {
  id: 'transporters',
  slug: 'transporters'
}

export const transportersSelectPage = {
  id: 'transporters-select',
  slug: 'transporters/select'
}
