import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'

import * as contact from './controller.js'

const get = contact.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(contact)

const CONTACT = STUB_BOOK.find(
  (record) => record.name === 'Animal and Plant Health Agency'
)

describe('GET contact — select an address from the book', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should offer no way to add an address — the book is read-only here', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.createAddressHref).toBeUndefined()
    expect(result.view.context.copy.addNewAddress).toBeUndefined()
  })

  it('Should offer the book, then pre-select and commit the address that was picked', async () => {
    const postResult = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id }
    })
    expect(postResult.view).toBeUndefined()
    expect(postResult.after.contactAddress).toEqual({
      addressId: CONTACT.id
    })

    const getResult = await driveHandler(get, { seed: postResult.after })
    const option = getResult.view.context.contactOptions.find(
      (candidate) => candidate.value === CONTACT.id
    )
    expect(option).toMatchObject({ text: CONTACT.name, checked: true })
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

  it('Should leave the page without committing when no contact is selected', async () => {
    const result = await driveHandler(post, {
      payload: {}
    })
    expect(result.view).toBeUndefined()
    expect(result.after.contactAddress).toBeUndefined()
  })

  it('Should treat a dangling contact addressId as unselected on GET and reject it on POST', async () => {
    const seed = { contactAddress: { addressId: 'gone' } }

    const getResult = await driveHandler(get, { seed })
    expect(
      getResult.view.context.contactOptions.every((option) => !option.checked)
    ).toBe(true)

    const postResult = await driveHandler(post, {
      seed,
      payload: { contactAddress: 'gone' }
    })
    expect(postResult.response.statusCode).toBe(400)
    expect(postResult.view.context.errors.contactAddress).toBeDefined()
    expect(postResult.after).toEqual(postResult.before)
  })
})
