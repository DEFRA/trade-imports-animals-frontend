import { SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import * as state from '../../../../../../../engine/index.js'
import { store } from '../../../../../../../engine/store.js'
import { addressHandshakeTokensCookie } from '../../../../../../../engine/persistence/session.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { BackendRequestError } from '../../../../../../../services/persistence/records/errors.js'
import { dispatchPages } from '../../index.js'
import { consignor } from '../../../../../obligations/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { partyForFulfilmentId } from '../party-for-fulfilment-id.js'
import * as addressBook from '../../../../../../../services/address-book/index.js'

import * as addressReturn from './controller.js'

const handler = addressReturn.routes[0].handler
const newAddressId = 'new-address-id'
const handshakeToken = 'handshake-token-value'

/** Built from the same link builder the controller uses, so the assertion is
 * exact and a redirect that lost the set's mount prefix fails here. */
const consignorPicker = (journeyId, query = '') =>
  `${pagePath(journeyId, partyForFulfilmentId(consignor.id).slug)}${query}`

const handshakeQuery = (fulfilmentId = consignor.id) => ({
  'fulfilment-id': fulfilmentId,
  'handshake-token': handshakeToken
})

const handshakeState = (fulfilmentId = consignor.id) => ({
  [addressHandshakeTokensCookie()]: {
    [fulfilmentId]: handshakeToken
  }
})

const configure = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
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

    expect(result.response.redirect).toBe(consignorPicker(result.journeyId))
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
        ...handshakeQuery(),
        addressId: newAddressId
      },
      state: handshakeState()
    })

    expect(result.response.redirect).toBe(
      consignorPicker(result.journeyId, `?selected=${newAddressId}`)
    )
    expect(result.after.consignor.addressId).toBe(newAddressId)
  })

  it('rejects a commit when the handshake token does not match', async () => {
    await expect(
      driveHandler(handler, {
        query: {
          ...handshakeQuery(),
          addressId: newAddressId,
          'handshake-token': 'wrong-token'
        },
        state: handshakeState()
      })
    ).rejects.toMatchObject({ output: { statusCode: 400 } })
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
        ...handshakeQuery(),
        addressId: 'missing-address'
      },
      state: handshakeState()
    })

    expect(result.response.redirect).toBe(
      consignorPicker(result.journeyId, '?handshakeError=not-found')
    )
    expect(result.after.consignor).toBeUndefined()
  })

  it('redirects to the picker when the address id belongs to another organisation', async () => {
    vi.spyOn(addressBook, 'party').mockImplementation(async (orgId) => {
      expect(orgId).toBe('5900001')
      return undefined
    })

    const result = await driveHandler(handler, {
      query: {
        ...handshakeQuery(),
        addressId: 'other-org-address'
      },
      state: handshakeState()
    })

    expect(result.response.redirect).toBe(
      consignorPicker(result.journeyId, '?handshakeError=not-found')
    )
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
        ...handshakeQuery(),
        addressId: newAddressId
      },
      state: handshakeState()
    })

    expect(result.response.redirect).toBe(
      consignorPicker(result.journeyId, '?handshakeError=unavailable')
    )
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
        ...handshakeQuery(),
        addressId: newAddressId
      },
      state: handshakeState()
    })

    expect(result.response.redirect).toBe(
      consignorPicker(result.journeyId, '?handshakeError=unavailable')
    )
    expect(result.response.statusCode).toBeUndefined()
    expect(result.after.consignor).toBeUndefined()
  })
})
