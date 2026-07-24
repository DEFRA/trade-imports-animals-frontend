import { copyFor } from '../../shared/copy.js'
import { consignmentContactSelectPage } from '../contact/page.js'
import { copy as contactEn } from '../contact/copy.en.js'
import { copy as contactCy } from '../contact/copy.cy.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const partyCopy = copyFor({ en, cy }).parties
const contactCopy = copyFor({ en: contactEn, cy: contactCy })

/** The five consignment parties. Each is one obligation, one address-book role
 * and one page of copy — everything else about the five spokes is identical, so
 * they share ONE picker (party-picker.controller.js) and the hub builds its
 * rows from the same table. */
export const PARTIES = [
  {
    id: 'placeOfOrigin',
    role: 'placeOfOrigin',
    slug: 'place-of-origin/select',
    returnSlug: 'addresses',
    ...partyCopy.placeOfOrigin
  },
  {
    id: 'consignor',
    role: 'consignor',
    slug: 'consignors/select',
    returnSlug: 'addresses',
    ...partyCopy.consignor
  },
  {
    id: 'consignee',
    role: 'consignee',
    slug: 'consignees/select',
    returnSlug: 'addresses',
    ...partyCopy.consignee
  },
  {
    id: 'importer',
    role: 'importer',
    slug: 'importers/select',
    returnSlug: 'addresses',
    ...partyCopy.importer
  },
  {
    id: 'placeOfDestination',
    role: 'destination',
    slug: 'destinations/select',
    returnSlug: 'addresses',
    ...partyCopy.placeOfDestination
  }
]

/** Contact can launch the shared create-address form, but it is deliberately
 * not a consignment-address hub spoke and therefore does not belong in PARTIES. */
export const CONTACT_PARTY = {
  id: 'contactAddress',
  role: 'contact',
  slug: consignmentContactSelectPage.slug,
  returnSlug: consignmentContactSelectPage.slug,
  title: contactCopy.title,
  hint: contactCopy.hint,
  error: contactCopy.errors.contactRequired
}

export const partyOf = (id) =>
  PARTIES.find((party) => party.id === id) ??
  (CONTACT_PARTY.id === id ? CONTACT_PARTY : undefined)
