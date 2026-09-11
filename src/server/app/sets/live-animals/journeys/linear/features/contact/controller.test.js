import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { config } from '../../../../../../../../config/config.js'
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
import * as state from '../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import { BackendRequestError } from '../../../../../../services/persistence/records/errors.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'

import * as contact from './controller.js'

const get = contact.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(contact)

const CONTACT = STUB_BOOK.find(
  (record) => record.name === 'Animal and Plant Health Agency'
)
const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'

describe('GET contact — select an address from the book', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should offer no INS add link in stub mode', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.addAddressHref).toBeFalsy()
    expect(result.view.context.addNewAddressLabel).toBe('Add a new address')
  })

  it('Should offer the book, then pre-select and commit the address that was picked', async () => {
    const postResult = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id }
    })
    expect(postResult.view).toBeUndefined()
    expect(postResult.after.contactAddress).toMatchObject({
      addressId: CONTACT.id,
      name: CONTACT.name
    })
    expect(postResult.after.contactAddress.address).toBeDefined()

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

describe('GET contact — INS add-address link', () => {
  const originalMode = config.get('stubMode')
  const originalInsUrl = config.get(INS_FRONTEND_BASE_URL_KEY)

  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  afterEach(() => {
    vi.unstubAllGlobals()
    config.set('stubMode', originalMode)
    config.set(INS_FRONTEND_BASE_URL_KEY, originalInsUrl)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
    config.set('stubMode', originalMode)
    config.set(INS_FRONTEND_BASE_URL_KEY, originalInsUrl)
  })

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
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  it('Should re-render the page when saving the selection fails', async () => {
    vi.spyOn(state, 'commit').mockRejectedValue(
      new BackendRequestError('save answers', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const result = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after.contactAddress).toBeUndefined()
  })
})
