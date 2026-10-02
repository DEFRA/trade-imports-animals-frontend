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

const STORED_COPY = {
  name: 'Contact Ltd',
  address: { addressLine1: '1 Road', countryCode: 'GB' }
}

describe('#validation — never answered', () => {
  it('Should raise no error when the trader has never selected a contact address', async () => {
    const { errors } = await validation.onStored({}, {})

    expect(errors).toEqual({})
  })
})

describe('#validation — a stored copy', () => {
  it('Should raise no error for a stored copy, with or without a book in hand', async () => {
    expect(
      (await validation.onStored({ contactAddress: STORED_COPY }, {})).errors
    ).toEqual({})
    expect(
      (
        await validation.onStored(
          { contactAddress: STORED_COPY },
          { addressOptions: addressOptionsOf('real-id') }
        )
      ).errors
    ).toEqual({})
  })

  it('Should leave no radio selected, the copy keeping no address-book id', async () => {
    const { values } = await validation.onStored(
      { contactAddress: STORED_COPY },
      {}
    )

    expect(values.contactAddress).toBe('')
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

  it('Should raise no error on a submission with no selection', async () => {
    const { errors } = await validation.onSubmit({}, { addressOptions })

    expect(errors).toEqual({})
  })
})
