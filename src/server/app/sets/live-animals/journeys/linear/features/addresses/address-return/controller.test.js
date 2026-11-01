import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import { addressHandshakeTokensCookie } from '../../../../../../../engine/persistence/session.js'
import {
  addressBookAnswering,
  driveHandler,
  expectOneLogged,
  expectOneSaveFallbackLogged,
  resetMocksAndConfigAfterTests,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { consignor } from '../../../../../obligations/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { partyForFulfilmentId } from '../party-for-fulfilment-id.js'

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

const newAddressBody = () =>
  JSON.stringify({
    id: newAddressId,
    name: 'New Farm',
    deleted: false,
    addressLine1: '1 Test Lane',
    townOrCity: 'Carlisle',
    postcode: 'CA1 1AA',
    countryCode: 'GB'
  })

describe('GET /address-return', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

  it('redirects to the party picker when no address id is supplied', async () => {
    const result = await driveHandler(handler, {
      query: { 'fulfilment-id': consignor.id }
    })

    expect(result.response.redirect).toBe(consignorPicker(result.journeyId))
  })

  it('commits a copy of the returned address and redirects to the picker', async () => {
    addressBookAnswering({ body: newAddressBody() })

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
    expect(result.after.consignor).not.toHaveProperty('addressId')
    expect(result.after.consignor.address).toMatchObject({
      townOrCity: 'Carlisle',
      postcode: 'CA1 1AA'
    })
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
    addressBookAnswering({ status: 404 })

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
    expectOneLogged(result.logger, {
      level: 'info',
      fields: {
        journeyId: result.journeyId,
        role: 'consignor',
        addressId: 'missing-address',
        reason: 'address-not-found'
      },
      message: 'Returned address not found, picker shown again'
    })
  })

  it('redirects to the picker when the address id belongs to another organisation', async () => {
    addressBookAnswering((request) =>
      request.url.includes('/organisation/5900001/addresses/other-org-address')
        ? { status: 404 }
        : { status: 503, statusText: 'Service Unavailable' }
    )

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
    addressBookAnswering({ status: 503, statusText: 'Service Unavailable' })

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
    expectOneLogged(result.logger, {
      level: 'warn',
      fields: {
        journeyId: result.journeyId,
        role: 'consignor',
        addressId: newAddressId,
        err: expect.objectContaining({ status: 503 })
      },
      message: 'Returned address could not be read, picker shown again'
    })
  })

  it('redirects to the picker when saving the returned address fails', async () => {
    addressBookAnswering({ body: newAddressBody() })
    const failure = unavailableBackendError('save answers')

    const result = await driveHandler(handler, {
      query: {
        ...handshakeQuery(),
        addressId: newAddressId
      },
      state: handshakeState(),
      saveFailure: failure
    })

    expect(result.response.redirect).toBe(
      consignorPicker(result.journeyId, '?handshakeError=unavailable')
    )
    expect(result.response.statusCode).toBeUndefined()
    expect(result.after.consignor).toBeUndefined()
    expectOneSaveFallbackLogged(result.logger, {
      journeyId: result.journeyId,
      err: failure
    })
  })
})
