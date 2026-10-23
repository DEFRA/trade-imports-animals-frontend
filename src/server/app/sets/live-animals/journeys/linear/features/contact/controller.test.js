import { SET_ID } from '../../../../set.js'
import { describe, expect, it, vi } from 'vitest'

import { config } from '../../../../../../../../config/config.js'
import {
  driveHandler,
  expectOneRefusalLogged,
  postHandlerOf,
  resetMocksAndConfigAfterTests,
  useStubbedJourney,
  unavailableBackendError
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { pagePath } from '../../../../../../shared/paths.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'

import * as contact from './controller.js'

const get = contact.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(contact)

const CONTACT = STUB_BOOK.find(
  (record) => record.name === 'Animal and Plant Health Agency'
)
const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'
const HELD_CONTACT = { name: 'Held Contact', address: { countryCode: 'GB' } }
const editHrefOf = (journeyId) =>
  `${pagePath(journeyId, 'consignment/contact/edit')}?return=consignment%2Fcontact%2Fselect`

describe('GET contact — select an address from the book', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should offer no INS add link in stub mode', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.addAddressHref).toBeFalsy()
    expect(result.view.context.addNewAddressLabel).toBe('Add a new address')
  })

  it('Should surface a not-found handshake error', async () => {
    const result = await driveHandler(get, {
      query: { handshakeError: 'not-found' }
    })

    expect(result.view.context.errorSummary.errorList[0].text).toContain(
      'could not be found'
    )
    expect(result.view.context.errorSummary.errorList[0].href).toBe(
      '#contactAddress'
    )
    expect(result.view.context.recoverableError).toBe(false)
  })

  it('Should surface an unavailable handshake error', async () => {
    const result = await driveHandler(get, {
      query: { handshakeError: 'unavailable' }
    })

    expect(result.view.context.errorSummary.errorList[0].text).toContain(
      'could not be reached'
    )
    expect(result.view.context.recoverableError).toBe(true)
  })

  it('Should commit a copy of the picked address, then show it as the current contact and still selected', async () => {
    const postResult = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id }
    })
    expect(postResult.view).toBeUndefined()
    expect(postResult.after.contactAddress).toMatchObject({
      pickedFromId: CONTACT.id,
      name: CONTACT.name
    })
    expect(postResult.after.contactAddress.address).toBeDefined()

    const getResult = await driveHandler(get, { seed: postResult.after })
    const { contactOptions, currentContact } = getResult.view.context
    expect(
      contactOptions
        .filter((option) => option.checked)
        .map(({ value }) => value)
    ).toEqual([CONTACT.id])
    expect(currentContact).toMatchObject({
      name: CONTACT.name,
      editHref: editHrefOf(getResult.journeyId)
    })
  })

  it('Should select nothing when the record the contact was picked from is gone', async () => {
    const result = await driveHandler(get, {
      seed: { contactAddress: { ...HELD_CONTACT, pickedFromId: 'gone' } }
    })

    const { contactOptions, errorSummary } = result.view.context
    expect(contactOptions.every((option) => !option.checked)).toBe(true)
    expect(errorSummary).toBeNull()
  })

  it('Should select nothing for a contact whose details were edited here', async () => {
    const result = await driveHandler(get, {
      seed: { contactAddress: HELD_CONTACT }
    })

    expect(
      result.view.context.contactOptions.every((option) => !option.checked)
    ).toBe(true)
  })

  it('Should carry the change context onto the current contact edit link', async () => {
    const result = await driveHandler(get, {
      seed: { contactAddress: HELD_CONTACT },
      query: { change: '1' }
    })

    expect(result.view.context.currentContact.editHref).toBe(
      `${editHrefOf(result.journeyId)}&change=1`
    )
  })

  it('Should show no current contact when none has been picked', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.currentContact).toBeNull()
  })

  it('Should keep the copy already held when saved with nothing selected', async () => {
    const result = await driveHandler(post, {
      seed: { contactAddress: HELD_CONTACT },
      payload: {}
    })

    expect(result.after.contactAddress).toEqual(HELD_CONTACT)
  })
})

describe('POST contact — invalid payload', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should answer 400 and re-render an out-of-list contact, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { contactAddress: 'not-a-real-contact' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after).toEqual(result.before)
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['contactAddress']
    })
  })

  it('Should keep the current contact card on a 400 re-render', async () => {
    const result = await driveHandler(post, {
      seed: { contactAddress: HELD_CONTACT },
      payload: { contactAddress: 'not-a-real-contact' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.currentContact).toMatchObject({
      name: HELD_CONTACT.name,
      editHref: editHrefOf(result.journeyId)
    })
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

describe('GET contact — INS add-address link', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests(INS_FRONTEND_BASE_URL_KEY)

  it('Should offer an INS add-address link when not in stub mode', async () => {
    config.set('stubMode', false)
    config.set(INS_FRONTEND_BASE_URL_KEY, 'http://localhost:3002')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          items: [],
          page: 1,
          pageSize: 25,
          totalItems: 0,
          totalPages: 1
        })
      }))
    )

    const result = await driveHandler(get)

    expect(result.view.context.addAddressHref).toContain(
      'http://localhost:3002/address-book/add'
    )
    expect(result.view.context.addAddressHref).toContain('journey-type=gbn-ag')
    expect(result.view.context.addAddressHref).toContain(
      `notification-id=${result.journeyId}`
    )
    expect(result.view.context.addAddressHref).toContain('fulfilment-id=')
  })
})

describe('POST contact — recoverable save failure', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should re-render the page when saving the selection fails', async () => {
    const result = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id },
      saveFailure: unavailableBackendError('save answers')
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after.contactAddress).toBeUndefined()
  })

  it('Should keep the current contact card when saving the selection fails', async () => {
    const result = await driveHandler(post, {
      seed: { contactAddress: HELD_CONTACT },
      payload: { contactAddress: CONTACT.id },
      saveFailure: unavailableBackendError('save answers')
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.currentContact).toMatchObject({
      name: HELD_CONTACT.name
    })
  })
})
