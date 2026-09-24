import { describe, expect, it } from 'vitest'

import { validation } from './validate.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

// The membership rule ("this id is one the org's book still has") can only
// fire where a book was fetched, so these options are the minimal shape
// `fields` reads from `addressOptions` — an id, nothing else.
const addressOptionsOf = (...ids) => ids.map((id) => ({ id }))

describe('#validation — deleted since picked', () => {
  it('Should raise the "no longer available" message when a stored address id has been dropped from the sanitised answers', async () => {
    const { errors } = await validation.onStored(
      {},
      { storedAnswers: { contactAddress: { addressId: 'deleted-id' } } }
    )

    expect(errors.contactAddress).toBe(copy.errors.contactNoLongerAvailable)
  })
})

describe('#validation — never answered', () => {
  it('Should raise no error when the trader has never selected a contact address', async () => {
    const { errors } = await validation.onStored({}, {})

    expect(errors).toEqual({})
  })
})

describe('#validation — still resolves', () => {
  it('Should raise no error when the stored address id still resolves and is present in the address book', async () => {
    const addressId = 'still-here'
    const { errors } = await validation.onStored(
      { contactAddress: { addressId } },
      {
        addressOptions: addressOptionsOf(addressId),
        storedAnswers: { contactAddress: { addressId } }
      }
    )

    expect(errors).toEqual({})
  })
})

describe('#validation — tampered submit', () => {
  const addressOptions = addressOptionsOf('real-id')

  it('Should raise "select a contact address" when the submitted id is not in the address book', async () => {
    const { errors } = await validation.onSubmit(
      { contactAddress: 'not-in-book' },
      { addressOptions }
    )

    expect(errors.contactAddress).toBe(copy.errors.contactRequired)
  })

  it('Should raise no error when the submitted id is in the address book', async () => {
    const { errors } = await validation.onSubmit(
      { contactAddress: 'real-id' },
      { addressOptions }
    )

    expect(errors).toEqual({})
  })
})

describe('#validation — no book in hand (task list and review page skip the address-book fetch)', () => {
  it('Should raise no membership error for a stored address id it has no book to check, without addressOptions', async () => {
    const { errors } = await validation.onStored(
      { contactAddress: { addressId: 'unverifiable-id' } },
      {}
    )

    expect(errors).toEqual({})
  })
})

describe('#validation — onSubmit is not the deleted-since-picked rule', () => {
  it('Should raise no "no longer available" message on a submission with a fresh valid selection, even when storedAnswers records a previously deleted address', async () => {
    const { errors } = await validation.onSubmit(
      { contactAddress: 'new-id' },
      {
        addressOptions: addressOptionsOf('new-id'),
        storedAnswers: { contactAddress: { addressId: 'old-deleted-id' } }
      }
    )

    expect(errors).toEqual({})
  })

  it('Should raise no "no longer available" message on a submission with no selection, even when storedAnswers records a previously deleted address', async () => {
    const { errors } = await validation.onSubmit(
      {},
      {
        storedAnswers: { contactAddress: { addressId: 'old-deleted-id' } }
      }
    )

    expect(errors).toEqual({})
  })
})
