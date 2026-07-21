import { copyFor } from '../../shared/copy.js'
import { copy as en } from './copy.en.js'

const partyCopy = copyFor({ en }).parties

/** The five consignment parties. Each is one obligation, one address-book role
 * and one page of copy — everything else about the five spokes is identical, so
 * they share ONE picker (party-picker.controller.js) and the hub builds its
 * rows from the same table. */
export const PARTIES = [
  {
    id: 'placeOfOrigin',
    role: 'placeOfOrigin',
    slug: 'place-of-origin/select',
    ...partyCopy.placeOfOrigin
  },
  {
    id: 'consignor',
    role: 'consignor',
    slug: 'consignors/select',
    ...partyCopy.consignor
  },
  {
    id: 'consignee',
    role: 'consignee',
    slug: 'consignees/select',
    ...partyCopy.consignee
  },
  {
    id: 'importer',
    role: 'importer',
    slug: 'importers/select',
    ...partyCopy.importer
  },
  {
    id: 'placeOfDestination',
    role: 'destination',
    slug: 'destinations/select',
    ...partyCopy.placeOfDestination
  }
]

export const partyOf = (id) => PARTIES.find((party) => party.id === id)
