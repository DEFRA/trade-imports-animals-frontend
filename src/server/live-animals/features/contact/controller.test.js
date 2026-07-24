import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerEndingWith,
  postHandlerOf
} from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as addressBook from '../../services/address-book/index.js'
import { pagePath } from '../../config.js'

import * as contact from './controller.js'
import * as createAddress from '../addresses/create-address.controller.js'

const get = contact.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(contact)
const postCreate = postHandlerEndingWith(createAddress, 'addresses/create')

const contactPayload = {
  for: 'contactAddress',
  nameOrOrganisationName: 'Round-trip Contact Ltd',
  addressLine1: '12 Contact Street',
  addressLine2: '',
  townOrCity: 'Bristol',
  county: '',
  postalOrZipCode: 'BS1 1AA',
  country: 'United Kingdom',
  telephoneNumber: '0117 555 0101',
  emailAddress: 'contact@example.co.uk'
}

describe('GET contact — select or create an address', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should render the create-address link for a contact address', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.createAddressHref).toBe(
      pagePath(result.journeyId, 'addresses/create?for=contactAddress')
    )
    expect(result.view.context.copy.addNewAddress).toBe(
      'Add a new contact address'
    )
  })

  it('Should list and pre-select a newly created contact, then accept it as a valid selection', async () => {
    const createdResult = await driveHandler(postCreate, {
      payload: contactPayload
    })
    const created = addressBook
      .parties('contact')
      .find((option) => option.name === contactPayload.nameOrOrganisationName)

    const getResult = await driveHandler(get, {
      seed: createdResult.after
    })
    const option = getResult.view.context.contactOptions.find(
      (candidate) => candidate.value === created.id
    )

    expect(option).toMatchObject({
      text: 'Round-trip Contact Ltd',
      checked: true
    })

    const postResult = await driveHandler(post, {
      payload: { contactAddress: created.id }
    })
    expect(postResult.view).toBeUndefined()
    expect(postResult.after.contactAddress.name).toBe('Round-trip Contact Ltd')
    expect(postResult.after.contactAddress.address.townOrCity).toBe('Bristol')
  })
})

describe('POST contact — invalid payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should answer 400 and re-render an out-of-list contact, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { contactAddress: 'not-a-real-contact' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})
