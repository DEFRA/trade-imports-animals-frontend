/** The five consignment parties. Each is one obligation, one address-book role
 * and one page of copy — everything else about the five spokes is identical, so
 * they share ONE picker (party-picker.controller.js) and the hub builds its
 * rows from the same table. */
export const PARTIES = [
  {
    id: 'placeOfOrigin',
    role: 'placeOfOrigin',
    slug: 'place-of-origin/select',
    title: 'Place of origin',
    hint: 'The address where the animals begin their journey to Great Britain',
    error: 'Select a place of origin from the list'
  },
  {
    id: 'consignor',
    role: 'consignor',
    slug: 'consignors/select',
    title: 'Consignor or exporter',
    hint: 'This is the sender of the consignment.',
    error: 'Select a consignor from the list'
  },
  {
    id: 'consignee',
    role: 'consignee',
    slug: 'consignees/select',
    title: 'Consignee',
    hint: 'This is the receiver or buyer of the consignment being shipped or transported.',
    error: 'Select a consignee from the list'
  },
  {
    id: 'importer',
    role: 'importer',
    slug: 'importers/select',
    title: 'Importer',
    hint: 'This is usually the same as the consignee. You can select a different person if needed.',
    error: 'Select an importer from the list'
  },
  {
    id: 'placeOfDestination',
    role: 'destination',
    slug: 'destinations/select',
    title: 'Place of destination',
    hint: 'This is where the animals will be unloaded and accommodated for at least 48 hours. If a health certificate is required, it will show this address.',
    error: 'Select a place of destination from the list'
  }
]

export const partyOf = (id) => PARTIES.find((party) => party.id === id)
