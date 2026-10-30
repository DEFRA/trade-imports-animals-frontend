import { SET_ID } from '../../../../../set.js'
import { beforeEach, describe, expect, it } from 'vitest'

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
import { consignor, contactAddress } from '../../../../../obligations/index.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { partyForFulfilmentId } from '../party-for-fulfilment-id.js'
import { ADDRESS_LANDING } from '../ins-handshake.js'
import { addedAddressBannerState } from '../test-support.js'

import * as addressReturn from './controller.js'

const handler = addressReturn.routes[0].handler
const newAddressId = 'new-address-id'
const handshakeToken = 'handshake-token-value'
const storedName = 'New Farm'
const UNKNOWN_FULFILMENT_ID = 'not-a-real-obligation'

const partyPagePath = (fulfilmentId, journeyId, query) =>
  `${pagePath(journeyId, partyForFulfilmentId(fulfilmentId).slug)}${query ?? ''}`

const consignorPicker = (journeyId, query) =>
  partyPagePath(consignor.id, journeyId, query)
const consignmentAddressesPage = (journeyId) => pagePath(journeyId, 'addresses')

const handshakeQuery = (fulfilmentId = consignor.id) => ({
  'fulfilment-id': fulfilmentId,
  'handshake-token': handshakeToken
})

const returnedQuery = (landing, fulfilmentId = consignor.id) => ({
  ...handshakeQuery(fulfilmentId),
  addressId: newAddressId,
  landing
})

const handshakeState = (fulfilmentId = consignor.id) => ({
  [addressHandshakeTokensCookie()]: {
    [fulfilmentId]: handshakeToken
  }
})

const newAddressBody = () =>
  JSON.stringify({
    id: newAddressId,
    name: storedName,
    deleted: false,
    addressLine1: '1 Test Lane',
    townOrCity: 'Carlisle',
    postcode: 'CA1 1AA',
    countryCode: 'GB'
  })

const landedLog = (journeyId, fields) => ({
  level: 'info',
  fields: { journeyId, ...fields },
  message: 'Returned from the address book'
})

const heldAnswers = { consignor: { name: 'Held Farm' } }

const refusalOf = async (query, state = handshakeState()) => {
  let error
  const driven = await driveHandler(
    (request, h) =>
      handler(request, h).catch((thrown) => {
        error = thrown
      }),
    { seed: heldAnswers, query, state }
  )
  return {
    error,
    logger: driven.logger,
    journeyId: driven.journeyId,
    answersAfter: driven.after
  }
}

const expectRefused = (
  { error, logger, journeyId, answersAfter },
  { fulfilmentId, landing, role, reason }
) => {
  expect(error.output.statusCode).toBe(400)
  expect(answersAfter).toEqual(heldAnswers)
  expectOneLogged(logger, {
    level: 'warn',
    fields: { journeyId, fulfilmentId, landing, role, reason },
    message: 'Address return refused'
  })
}

describe('GET /address-return', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

  describe('Back, with no address and no landing', () => {
    it('Should redirect to the role picker and log the landing', async () => {
      const result = await driveHandler(handler, {
        query: { 'fulfilment-id': consignor.id }
      })

      expect(result.response.redirect).toBe(consignorPicker(result.journeyId))
      expectOneLogged(
        result.logger,
        landedLog(result.journeyId, { role: 'consignor', landing: 'back' })
      )
    })

    it('Should redirect the contact to the contact page and commit nothing', async () => {
      const result = await driveHandler(handler, {
        query: { 'fulfilment-id': contactAddress.id }
      })

      expect(result.response.redirect).toBe(
        partyPagePath(contactAddress.id, result.journeyId)
      )
      expect(result.after.contactAddress).toBeUndefined()
    })
  })

  describe('select landing', () => {
    it('Should commit a copy of the address, land on the Consignment addresses page and set the banner', async () => {
      addressBookAnswering({ body: newAddressBody() })

      const result = await driveHandler(handler, {
        query: returnedQuery(ADDRESS_LANDING.SELECT),
        state: handshakeState()
      })

      expect(result.response.redirect).toBe(
        consignmentAddressesPage(result.journeyId)
      )
      expect(result.after.consignor).not.toHaveProperty('addressId')
      expect(result.after.consignor.address).toMatchObject({
        townOrCity: 'Carlisle',
        postcode: 'CA1 1AA'
      })
      expect(result.cookies).toEqual(addedAddressBannerState(storedName))
      expectOneLogged(
        result.logger,
        landedLog(result.journeyId, {
          role: 'consignor',
          landing: 'select',
          addressId: newAddressId
        })
      )
    })

    it('Should commit the contact answer and land on the contact page', async () => {
      addressBookAnswering({ body: newAddressBody() })

      const result = await driveHandler(handler, {
        query: returnedQuery(ADDRESS_LANDING.SELECT, contactAddress.id),
        state: handshakeState(contactAddress.id)
      })

      expect(result.response.redirect).toBe(
        partyPagePath(contactAddress.id, result.journeyId)
      )
      expect(result.after.contactAddress.address).toMatchObject({
        townOrCity: 'Carlisle'
      })
      expect(result.cookies).toEqual(addedAddressBannerState(storedName))
    })

    it('Should treat a returned address with no landing as select', async () => {
      addressBookAnswering({ body: newAddressBody() })

      const result = await driveHandler(handler, {
        query: { ...handshakeQuery(), addressId: newAddressId },
        state: handshakeState()
      })

      expect(result.response.redirect).toBe(
        consignmentAddressesPage(result.journeyId)
      )
      expect(result.after.consignor.address).toMatchObject({
        townOrCity: 'Carlisle'
      })
    })

    it('Should redirect to the picker when saving the returned address fails', async () => {
      addressBookAnswering({ body: newAddressBody() })
      const failure = unavailableBackendError('save answers')

      const result = await driveHandler(handler, {
        query: returnedQuery(ADDRESS_LANDING.SELECT),
        state: handshakeState(),
        saveFailure: failure
      })

      expect(result.response.redirect).toBe(
        consignorPicker(result.journeyId, '?handshakeError=unavailable')
      )
      expect(result.response.statusCode).toBeUndefined()
      expect(result.after.consignor).toBeUndefined()
      expect(result.cookies).toEqual({})
      expectOneSaveFallbackLogged(result.logger, {
        journeyId: result.journeyId,
        err: failure
      })
    })
  })

  describe('return landing', () => {
    it('Should land on the role picker with nothing selected, commit nothing and set the banner', async () => {
      addressBookAnswering({ body: newAddressBody() })

      const result = await driveHandler(handler, {
        query: returnedQuery(ADDRESS_LANDING.RETURN),
        state: handshakeState()
      })

      expect(result.response.redirect).toBe(consignorPicker(result.journeyId))
      expect(result.after.consignor).toBeUndefined()
      expect(result.cookies).toEqual(addedAddressBannerState(storedName))
      expectOneLogged(
        result.logger,
        landedLog(result.journeyId, {
          role: 'consignor',
          landing: 'return',
          addressId: newAddressId
        })
      )
    })
  })

  describe('cancel landing', () => {
    it('Should land on the hub, commit nothing and set no banner', async () => {
      const result = await driveHandler(handler, {
        query: { ...handshakeQuery(), landing: ADDRESS_LANDING.CANCEL },
        state: handshakeState()
      })

      expect(result.response.redirect).toBe(hubPath(result.journeyId))
      expect(result.after.consignor).toBeUndefined()
      expect(result.cookies).toEqual({})
      expectOneLogged(
        result.logger,
        landedLog(result.journeyId, { role: 'consignor', landing: 'cancel' })
      )
    })
  })

  describe.each([
    ADDRESS_LANDING.SELECT,
    ADDRESS_LANDING.RETURN,
    ADDRESS_LANDING.CANCEL
  ])('%s landing handshake', (landing) => {
    it('Should clear the handshake token cookie so the return URL cannot be used again', async () => {
      addressBookAnswering({ body: newAddressBody() })

      const result = await driveHandler(handler, {
        query: returnedQuery(landing),
        state: handshakeState()
      })

      expect(result.unstated).toEqual([addressHandshakeTokensCookie()])
    })
  })

  describe('address not readable', addressNotReadableTests)

  describe('refusals', refusalTests)
})

function addressNotReadableTests() {
  describe.each([ADDRESS_LANDING.SELECT, ADDRESS_LANDING.RETURN])(
    'address-bearing %s landing',
    (landing) => {
      it('Should redirect to the picker when the returned address id is not in the book', async () => {
        addressBookAnswering({ status: 404 })

        const result = await driveHandler(handler, {
          query: { ...returnedQuery(landing), addressId: 'missing-address' },
          state: handshakeState()
        })

        expect(result.response.redirect).toBe(
          consignorPicker(result.journeyId, '?handshakeError=not-found')
        )
        expect(result.after.consignor).toBeUndefined()
        expect(result.cookies).toEqual({})
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

      it('Should redirect to the picker when the address id belongs to another organisation', async () => {
        addressBookAnswering((request) =>
          request.url.includes(
            '/organisation/5900001/addresses/other-org-address'
          )
            ? { status: 404 }
            : { status: 503, statusText: 'Service Unavailable' }
        )

        const result = await driveHandler(handler, {
          query: { ...returnedQuery(landing), addressId: 'other-org-address' },
          state: handshakeState()
        })

        expect(result.response.redirect).toBe(
          consignorPicker(result.journeyId, '?handshakeError=not-found')
        )
        expect(result.after.consignor).toBeUndefined()
      })

      it('Should redirect to the picker when the address book is unavailable', async () => {
        addressBookAnswering({ status: 503, statusText: 'Service Unavailable' })

        const result = await driveHandler(handler, {
          query: returnedQuery(landing),
          state: handshakeState()
        })

        expect(result.response.redirect).toBe(
          consignorPicker(result.journeyId, '?handshakeError=unavailable')
        )
        expect(result.after.consignor).toBeUndefined()
        expect(result.cookies).toEqual({})
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
    }
  )
}

function refusalTests() {
  beforeEach(() => {
    addressBookAnswering({ body: newAddressBody() })
  })

  describe.each([
    ADDRESS_LANDING.SELECT,
    ADDRESS_LANDING.RETURN,
    ADDRESS_LANDING.CANCEL
  ])('on the %s landing', (landing) => {
    it('Should refuse a stale handshake token', async () => {
      const refused = await refusalOf({
        ...returnedQuery(landing),
        'handshake-token': 'wrong-token'
      })

      expectRefused(refused, {
        fulfilmentId: consignor.id,
        landing,
        role: 'consignor',
        reason: 'invalid-handshake'
      })
    })

    it('Should refuse a missing handshake token', async () => {
      const refused = await refusalOf({
        ...returnedQuery(landing),
        'handshake-token': ''
      })

      expectRefused(refused, {
        fulfilmentId: consignor.id,
        landing,
        role: 'consignor',
        reason: 'invalid-handshake'
      })
    })

    it('Should refuse an unknown fulfilment id', async () => {
      const refused = await refusalOf({
        ...returnedQuery(landing),
        'fulfilment-id': UNKNOWN_FULFILMENT_ID
      })

      expectRefused(refused, {
        fulfilmentId: UNKNOWN_FULFILMENT_ID,
        landing,
        reason: 'unknown-fulfilment'
      })
    })
  })

  describe('refusals before the token is read', () => {
    const withStaleToken = (query) => ({
      ...query,
      'handshake-token': 'wrong-token'
    })

    it('Should refuse an unknown fulfilment id with no landing', async () => {
      const refused = await refusalOf(
        withStaleToken({ 'fulfilment-id': UNKNOWN_FULFILMENT_ID })
      )

      expectRefused(refused, {
        fulfilmentId: UNKNOWN_FULFILMENT_ID,
        landing: '',
        reason: 'unknown-fulfilment'
      })
    })

    it('Should refuse a landing the journey does not know', async () => {
      const refused = await refusalOf(
        withStaleToken(returnedQuery('elsewhere'))
      )

      expectRefused(refused, {
        fulfilmentId: consignor.id,
        landing: 'elsewhere',
        role: 'consignor',
        reason: 'unknown-landing'
      })
    })

    it('Should refuse an explicit back landing', async () => {
      const refused = await refusalOf(
        withStaleToken({ ...handshakeQuery(), landing: 'back' })
      )

      expectRefused(refused, {
        fulfilmentId: consignor.id,
        landing: 'back',
        role: 'consignor',
        reason: 'unknown-landing'
      })
      expect(refused.error.message).toBe('Unknown landing')
    })

    it.each([ADDRESS_LANDING.SELECT, ADDRESS_LANDING.RETURN])(
      'Should refuse the %s landing when it carries no address id',
      async (landing) => {
        const refused = await refusalOf(
          withStaleToken({ ...handshakeQuery(), landing })
        )

        expectRefused(refused, {
          fulfilmentId: consignor.id,
          landing,
          role: 'consignor',
          reason: 'address-missing'
        })
      }
    )
  })
}
