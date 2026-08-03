import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

describe('plant-products nominated-contacts copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('pins the page, field and repeated-action copy', () => {
    expect(en.caption).toBe('Contacts')
    expect(en.title).toBe('Nominated contacts (optional)')
    expect(en.labels).toEqual({
      contactName: 'Name',
      contactEmail: 'Email address',
      contactTelephone: 'Mobile number',
      contactIsAgent: 'This person is an agent'
    })
    expect(en.table.headers).toEqual({
      contactName: 'Name',
      contactEmail: 'Email address',
      contactTelephone: 'Mobile number'
    })
    expect(en.buttons).toEqual({
      addAnother: 'Add another person',
      remove: 'Remove'
    })
  })

  it('pins every canonical validation message', () => {
    expect(en.errors).toEqual({
      contactNameRequired: 'Enter a name',
      contactNameMax: 'Name must be 32 characters or fewer',
      contactEmailFormat:
        'Enter an email address in the correct format, like name@example.com',
      contactEmailMax: 'Email address must be 255 characters or fewer',
      contactTelephoneFormat:
        'Enter a mobile number in the correct format, like 07700 900 982 or +44 7700 900 982',
      contactTelephoneMax: 'Mobile number must be 30 characters or fewer',
      contactMethodRequired: 'Enter an email address or mobile number'
    })
  })
})
