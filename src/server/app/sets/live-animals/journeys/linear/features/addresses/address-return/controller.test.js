import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import * as state from '../../../../../../../engine/index.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'
import { BackendRequestError } from '../../../../../../../services/persistence/records/errors.js'
import { dispatchPages } from '../../index.js'
import { consignor } from '../../../../../obligations/index.js'
import * as addressBook from '../../../../../../../services/address-book/index.js'

import * as addressReturn from './controller.js'

const handler = addressReturn.routes[0].handler
const newAddressId = 'new-address-id'
const CONSIGNOR_PICKER_PATH = '/consignors/select'

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

describe('GET /address-return', () => {
  beforeAll(configure)
  beforeEach(() => {
    store.clear()
    vi.restoreAllMocks()
  })

  it('redirects to the party picker when no address id is supplied', async () => {
    const result = await driveHandler(handler, {
      query: { 'fulfilment-id': consignor.id }
    })

    expect(result.response.redirect).toContain(CONSIGNOR_PICKER_PATH)
  })

  it('commits the returned address id and redirects to the picker', async () => {
    vi.spyOn(addressBook, 'party').mockResolvedValue({
      id: newAddressId,
      name: 'New Farm',
      deleted: false,
      address: {
        addressLine1: '1 Test Lane',
        townOrCity: 'Carlisle',
        postalOrZipCode: 'CA1 1AA',
        country: 'United Kingdom'
      }
    })

    const result = await driveHandler(handler, {
      query: {
        'fulfilment-id': consignor.id,
        addressId: newAddressId
      }
    })

    expect(result.response.redirect).toContain(CONSIGNOR_PICKER_PATH)
    expect(result.response.redirect).toContain(`selected=${newAddressId}`)
    expect(result.after.consignor.addressId).toBe(newAddressId)
  })

  it('rejects an unknown fulfilment id', async () => {
    await expect(
      driveHandler(handler, {
        query: { 'fulfilment-id': 'not-a-real-obligation' }
      })
    ).rejects.toMatchObject({ output: { statusCode: 400 } })
  })

  it('redirects to the picker when the returned address id is not in the book', async () => {
    vi.spyOn(addressBook, 'party').mockResolvedValue(undefined)

    const result = await driveHandler(handler, {
      query: {
        'fulfilment-id': consignor.id,
        addressId: 'missing-address'
      }
    })

    expect(result.response.redirect).toContain(CONSIGNOR_PICKER_PATH)
    expect(result.response.redirect).toContain('handshakeError=not-found')
    expect(result.after.consignor).toBeUndefined()
  })

  it('redirects to the picker when the address book is unavailable', async () => {
    vi.spyOn(addressBook, 'party').mockRejectedValue(
      new BackendRequestError('get address', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const result = await driveHandler(handler, {
      query: {
        'fulfilment-id': consignor.id,
        addressId: newAddressId
      }
    })

    expect(result.response.redirect).toContain(CONSIGNOR_PICKER_PATH)
    expect(result.response.redirect).toContain('handshakeError=unavailable')
    expect(result.after.consignor).toBeUndefined()
  })

  it('redirects to the picker when saving the returned address fails', async () => {
    vi.spyOn(addressBook, 'party').mockResolvedValue({
      id: newAddressId,
      name: 'New Farm',
      deleted: false,
      address: {
        addressLine1: '1 Test Lane',
        townOrCity: 'Carlisle',
        postalOrZipCode: 'CA1 1AA',
        country: 'United Kingdom'
      }
    })
    vi.spyOn(state, 'commit').mockRejectedValue(
      new BackendRequestError('save answers', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const result = await driveHandler(handler, {
      query: {
        'fulfilment-id': consignor.id,
        addressId: newAddressId
      }
    })

    expect(result.response.redirect).toContain(CONSIGNOR_PICKER_PATH)
    expect(result.response.redirect).toContain('handshakeError=unavailable')
    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.after.consignor).toBeUndefined()
  })
})
