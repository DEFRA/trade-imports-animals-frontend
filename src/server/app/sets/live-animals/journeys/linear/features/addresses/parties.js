import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { addressesPage } from './page.js'

const partyCopy = copyFor({ en, cy }).parties
const returnSlug = addressesPage.slug

export const PARTIES = [
  {
    id: 'placeOfOrigin',
    addressBookRole: 'PLACE_OF_ORIGIN',
    slug: 'place-of-origin/select',
    editSlug: 'place-of-origin/edit',
    returnSlug,
    ...partyCopy.placeOfOrigin
  },
  {
    id: 'consignor',
    addressBookRole: 'CONSIGNOR',
    slug: 'consignors/select',
    editSlug: 'consignors/edit',
    returnSlug,
    ...partyCopy.consignor
  },
  {
    id: 'consignee',
    addressBookRole: 'CONSIGNEE',
    slug: 'consignees/select',
    editSlug: 'consignees/edit',
    returnSlug,
    ...partyCopy.consignee
  },
  {
    id: 'importer',
    addressBookRole: 'IMPORTER',
    slug: 'importers/select',
    editSlug: 'importers/edit',
    returnSlug,
    ...partyCopy.importer
  },
  {
    id: 'placeOfDestination',
    addressBookRole: 'PLACE_OF_DESTINATION',
    slug: 'destinations/select',
    editSlug: 'destinations/edit',
    returnSlug,
    ...partyCopy.placeOfDestination
  }
]

export const partyOf = (id) => PARTIES.find((party) => party.id === id)
