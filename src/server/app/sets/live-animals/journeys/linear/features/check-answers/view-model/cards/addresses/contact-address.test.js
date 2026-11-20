import { describe, expect, it } from 'vitest'

import { copy } from '../../../copy/copy.en.js'
import { copy as copyCy } from '../../../copy/copy.cy.js'
import { contactAddressCard } from './contact-address.js'

const contactAddress = {
  name: 'Animal and Plant Health Agency',
  address: {
    addressLine1: 'Woodham Lane',
    townOrCity: 'Addlestone',
    postcode: 'KT15 3NB',
    countryCode: 'GB'
  }
}

const cardFor = (readOnly) =>
  contactAddressCard({
    journeyId: 'DRAFT.IMP.2026.1',
    changeLinkTrail: '',
    reviewPageTrail: '',
    answers: { contactAddress },
    readOnly
  })

describe('#contactAddressCard', () => {
  it('Should hide the contact address from the Edit details action text, in English', () => {
    const [editDetails] = cardFor(false).rows[0].actions.items

    expect(editDetails.text).toBe(copy.editDetails)
    expect(editDetails.visuallyHiddenText).toBe(
      copy.hidden.cards.contactAddress
    )
  })

  it('Should hold the contact address hidden text in Welsh', () => {
    expect(copyCy.hidden.cards.contactAddress).toBe('cyfeiriad cyswllt')
  })

  it('Should offer no Edit details action on a read-only review', () => {
    expect(cardFor(true).rows[0].actions).toBeUndefined()
  })
})
