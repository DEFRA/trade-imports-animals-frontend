import { copyFor } from '../../../../../../shared/copy.js'
import { consignmentContactSelectPage } from '../contact/page.js'
import { copy as contactEn } from '../contact/copy/copy.en.js'
import { copy as contactCy } from '../contact/copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const partyCopy = copyFor({ en, cy }).parties
const contactCopy = copyFor({ en: contactEn, cy: contactCy })

/** The five consignment parties. Each is one obligation, one address-book role
 * and one page of copy — everything else about the five spokes is identical, so
 * they share ONE picker (party-picker.controller.js) and the hub builds its
 * rows from the same table.
 *
 * Every party is stored as a copy of the record picked from the book, and the
 * copy is edited in place on `editSlug`. An edit or delete in the book never
 * reaches the notification. */
export const PARTIES = [
  {
    id: 'placeOfOrigin',
    role: 'placeOfOrigin',
    slug: 'place-of-origin/select',
    editSlug: 'place-of-origin/edit',
    returnSlug: 'addresses',
    ...partyCopy.placeOfOrigin
  },
  {
    id: 'consignor',
    role: 'consignor',
    slug: 'consignors/select',
    editSlug: 'consignors/edit',
    returnSlug: 'addresses',
    ...partyCopy.consignor
  },
  {
    id: 'consignee',
    role: 'consignee',
    slug: 'consignees/select',
    editSlug: 'consignees/edit',
    returnSlug: 'addresses',
    ...partyCopy.consignee
  },
  {
    id: 'importer',
    role: 'importer',
    slug: 'importers/select',
    editSlug: 'importers/edit',
    returnSlug: 'addresses',
    ...partyCopy.importer
  },
  {
    id: 'placeOfDestination',
    role: 'destination',
    slug: 'destinations/select',
    editSlug: 'destinations/edit',
    returnSlug: 'addresses',
    ...partyCopy.placeOfDestination
  }
]

/** Contact picks from the same address book, but it is deliberately not a
 * consignment-address hub spoke and therefore does not belong in PARTIES. */
export const CONTACT_PARTY = {
  id: 'contactAddress',
  role: 'contact',
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
