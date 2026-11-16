import { copyFor } from '../../../../../../shared/copy.js'
import { consignmentContactSelectPage } from '../contact/page.js'
import { copy as contactEn } from '../contact/copy/copy.en.js'
import { copy as contactCy } from '../contact/copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const partyCopy = copyFor({ en, cy }).parties
const contactCopy = copyFor({ en: contactEn, cy: contactCy })

export const PARTIES = [
  {
    id: 'placeOfOrigin',
    addressBookRole: 'PLACE_OF_ORIGIN',
    slug: 'place-of-origin/select',
    editSlug: 'place-of-origin/edit',
    returnSlug: 'addresses',
    ...partyCopy.placeOfOrigin
  },
  {
    id: 'consignor',
    addressBookRole: 'CONSIGNOR',
    slug: 'consignors/select',
    editSlug: 'consignors/edit',
    returnSlug: 'addresses',
    ...partyCopy.consignor
  },
  {
    id: 'consignee',
    addressBookRole: 'CONSIGNEE',
    slug: 'consignees/select',
    editSlug: 'consignees/edit',
    returnSlug: 'addresses',
    ...partyCopy.consignee
  },
  {
    id: 'importer',
    addressBookRole: 'IMPORTER',
    slug: 'importers/select',
    editSlug: 'importers/edit',
    returnSlug: 'addresses',
    ...partyCopy.importer
  },
  {
    id: 'placeOfDestination',
    addressBookRole: 'PLACE_OF_DESTINATION',
    slug: 'destinations/select',
    editSlug: 'destinations/edit',
    returnSlug: 'addresses',
    ...partyCopy.placeOfDestination
  }
]

export const CONTACT_PARTY = {
  id: 'contactAddress',
  slug: consignmentContactSelectPage.slug,
  editSlug: 'consignment/contact/edit',
  returnSlug: consignmentContactSelectPage.slug,
  title: contactCopy.title,
  hint: contactCopy.hint,
  error: contactCopy.errors.contactRequired
}

export const partyOf = (id) =>
  PARTIES.find((party) => party.id === id) ??
  (CONTACT_PARTY.id === id ? CONTACT_PARTY : undefined)
