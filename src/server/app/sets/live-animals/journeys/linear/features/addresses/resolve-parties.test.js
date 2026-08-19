import { afterEach, describe, expect, it, vi } from 'vitest'

import * as addressBook from '../../../../../../services/address-book/index.js'
import {
  resolveParties,
  withoutUnresolvedPartyRefs
} from './resolve-parties.js'

const ORG_ID = '5900001'
const CONSIGNOR_ID = 'astra-rosales'
const CONSIGNOR_NAME = 'Astra Rosales'
const ORIGIN_ID = 'origin-farm'

/** `party()` is spied on rather than left to answer from the stub book, which
 * the unit suite runs against by default — an unmocked read would resolve to
 * whatever the stub happens to hold and prove nothing. */
const bookHolding = (records) =>
  vi
    .spyOn(addressBook, 'party')
    .mockImplementation(async (_orgId, addressId) => records[addressId])

const requestFor = (organisationId = ORG_ID) => ({
  auth: { credentials: { organisationId } },
  app: {}
})

const record = (id, name, extra = {}) => ({
  id,
  name,
  deleted: false,
  address: { addressLine1: '1 Test Street' },
  ...extra
})

afterEach(() => vi.restoreAllMocks())

describe('resolveParties', () => {
  it('Should resolve a referenced party to the record it points at', async () => {
    // A name the stub book cannot supply, so a spy that failed to intercept
    // would fail the test rather than answer plausibly from the stub.
    const spy = bookHolding({
      [CONSIGNOR_ID]: record(CONSIGNOR_ID, 'Only From The Mock Ltd')
    })

    const parties = await resolveParties(requestFor(), {
      consignor: { addressId: CONSIGNOR_ID }
    })

    expect(parties.consignor).toMatchObject({ name: 'Only From The Mock Ltd' })
    expect(spy).toHaveBeenCalledWith(ORG_ID, CONSIGNOR_ID)
  })

  it('Should pass an inline party through without reading the book (D24, D26)', async () => {
    // Both inline roles carry an addressId for the picker's benefit. Reading it
    // as a live reference is exactly what the D24/D26 ruling forbids.
    const spy = bookHolding({})
    const placeOfOrigin = { addressId: ORIGIN_ID, name: 'Origin Farm' }
    const contactAddress = { addressId: 'contact-1', name: 'Contact Ltd' }

    const parties = await resolveParties(requestFor(), {
      placeOfOrigin,
      contactAddress
    })

    expect(parties.placeOfOrigin).toBe(placeOfOrigin)
    expect(parties.contactAddress).toBe(contactAddress)
    expect(spy).not.toHaveBeenCalled()
  })

  it('Should resolve a deleted record to nothing, as if it were never entered', async () => {
    bookHolding({
      [CONSIGNOR_ID]: record(CONSIGNOR_ID, 'Gone Trader', { deleted: true })
    })

    const parties = await resolveParties(requestFor(), {
      consignor: { addressId: CONSIGNOR_ID }
    })

    expect(parties.consignor).toBeUndefined()
  })

  it('Should resolve a reference the book does not hold to nothing', async () => {
    bookHolding({})

    const parties = await resolveParties(requestFor(), {
      consignor: { addressId: 'never-existed' }
    })

    expect(parties.consignor).toBeUndefined()
  })

  it('Should let an address-book outage propagate rather than read as a deletion', async () => {
    vi.spyOn(addressBook, 'party').mockRejectedValue(new Error('book is down'))

    await expect(
      resolveParties(requestFor(), { consignor: { addressId: CONSIGNOR_ID } })
    ).rejects.toThrow('book is down')
  })

  it('Should read the book once per request however often a page asks', async () => {
    const spy = bookHolding({
      [CONSIGNOR_ID]: record(CONSIGNOR_ID, CONSIGNOR_NAME)
    })
    const request = requestFor()
    const answers = { consignor: { addressId: CONSIGNOR_ID } }

    const first = await resolveParties(request, answers)
    const second = await resolveParties(request, answers)

    expect(second).toBe(first)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('Should resolve without a request to memoise onto', async () => {
    bookHolding({ [CONSIGNOR_ID]: record(CONSIGNOR_ID, CONSIGNOR_NAME) })

    const parties = await resolveParties(undefined, {
      consignor: { addressId: CONSIGNOR_ID }
    })

    expect(parties.consignor).toMatchObject({ name: CONSIGNOR_NAME })
  })
})

describe('withoutUnresolvedPartyRefs', () => {
  it('Should drop a referenced party whose address no longer resolves', async () => {
    bookHolding({})

    const next = await withoutUnresolvedPartyRefs(requestFor(), {
      consignor: { addressId: 'deleted-since' },
      cph: '12/345/6789'
    })

    expect(next.consignor).toBeUndefined()
    expect(next.cph).toBe('12/345/6789')
  })

  it('Should keep an inline party whose source address has been deleted', async () => {
    // The copy is the answer. Deleting the record it was taken from is not a
    // dangling reference, so there is nothing to clear (D24, D26).
    bookHolding({})
    const placeOfOrigin = { addressId: ORIGIN_ID, name: 'Origin Farm' }

    const next = await withoutUnresolvedPartyRefs(requestFor(), {
      placeOfOrigin
    })

    expect(next.placeOfOrigin).toBe(placeOfOrigin)
  })

  it('Should return the answers unchanged when every reference still resolves', async () => {
    bookHolding({ [CONSIGNOR_ID]: record(CONSIGNOR_ID, CONSIGNOR_NAME) })
    const answers = { consignor: { addressId: CONSIGNOR_ID } }

    const next = await withoutUnresolvedPartyRefs(requestFor(), answers)

    // Same object, not a copy — nothing changed, so nothing is rebuilt.
    expect(next).toBe(answers)
  })

  it('Should leave an inline answer that carries no addressId alone', async () => {
    const spy = bookHolding({})
    const answers = { consignor: { name: 'Typed In Ltd' } }

    const next = await withoutUnresolvedPartyRefs(requestFor(), answers)

    expect(next).toBe(answers)
    expect(spy).not.toHaveBeenCalled()
  })
})
