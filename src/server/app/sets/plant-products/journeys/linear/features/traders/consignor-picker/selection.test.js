import { describe, expect, it } from 'vitest'

import { CANNED_CONSIGNORS } from '../../../../../services/address-book/canned-consignors.js'
import { writeSelection } from '../../../../../services/address-book/session-store.js'
import { NOTIFICATION_CONSIGNOR_ID } from './candidates.js'
import { chosenFor, selectedId } from './selection.js'

const CONSIGNOR_04_ID = 'example-consignor-04'
const CONSIGNOR_09_ID = 'example-consignor-09'
const CONSIGNOR_02_NAME = 'Example Consignor 02 (sample data)'

const sessionRequest = (overrides = {}) => {
  const values = new Map()
  return {
    query: {},
    ...overrides,
    yar: {
      get: (key) => values.get(key),
      set: (key, value) => values.set(key, value)
    }
  }
}

const consignorAnswers = {
  consignorName: 'Orchard Export SAS',
  consignorAddressLine1: '12 Rue des Vergers',
  consignorCity: 'Lyon',
  consignorTelephone: '+33 4 72 00 00 00',
  consignorCountry: 'FR',
  consignorEmail: 'exports@example.com'
}

// Full records, not id-only stubs: every row carries a name, so a selectedId
// that ever matched on name would have something to match against.
const notificationConsignorRecord = {
  id: NOTIFICATION_CONSIGNOR_ID,
  name: consignorAnswers.consignorName,
  telephone: consignorAnswers.consignorTelephone,
  email: consignorAnswers.consignorEmail,
  address: {
    addressLine1: consignorAnswers.consignorAddressLine1,
    city: consignorAnswers.consignorCity,
    country: consignorAnswers.consignorCountry
  }
}

const offered = [notificationConsignorRecord, ...CANNED_CONSIGNORS]

describe('consignor picker selection', () => {
  it('lets the query string win over the session and the answers', () => {
    const request = sessionRequest({
      query: { selected: CONSIGNOR_04_ID }
    })
    writeSelection(request, 'journey-1', CONSIGNOR_09_ID)

    expect(selectedId(request, 'journey-1', consignorAnswers, offered)).toBe(
      CONSIGNOR_04_ID
    )
  })

  it('lets the session win over the answers fallback', () => {
    const request = sessionRequest()
    writeSelection(request, 'journey-1', CONSIGNOR_09_ID)

    expect(selectedId(request, 'journey-1', consignorAnswers, offered)).toBe(
      CONSIGNOR_09_ID
    )
  })

  it('keeps one journey’s selection out of another journey', () => {
    const request = sessionRequest()
    writeSelection(request, 'journey-1', CONSIGNOR_09_ID)

    expect(selectedId(request, 'journey-2', {}, offered)).toBeUndefined()
  })

  it('falls back to the consignor on the notification', () => {
    expect(
      selectedId(sessionRequest(), 'journey-1', consignorAnswers, offered)
    ).toBe(NOTIFICATION_CONSIGNOR_ID)
  })

  it('falls through to the notification row when the session id is no longer offered', () => {
    const request = sessionRequest()
    writeSelection(request, 'journey-1', 'created-consignor-1')

    expect(selectedId(request, 'journey-1', consignorAnswers, offered)).toBe(
      NOTIFICATION_CONSIGNOR_ID
    )
  })

  it('keeps a second journey’s selection without losing the first', () => {
    const request = sessionRequest()
    writeSelection(request, 'journey-1', CONSIGNOR_09_ID)
    writeSelection(request, 'journey-2', CONSIGNOR_04_ID)

    expect(selectedId(request, 'journey-1', {}, offered)).toBe(CONSIGNOR_09_ID)
    expect(selectedId(request, 'journey-2', {}, offered)).toBe(CONSIGNOR_04_ID)
  })

  it('does not select a canned record whose name the answers happen to repeat', () => {
    const collidingAnswers = {
      ...consignorAnswers,
      consignorName: CONSIGNOR_02_NAME,
      consignorAddressLine1: '12 Rue des Vergers',
      consignorCity: 'Lyon'
    }

    const selected = selectedId(
      sessionRequest(),
      'journey-1',
      collidingAnswers,
      offered
    )

    expect(selected).toBe(NOTIFICATION_CONSIGNOR_ID)
    expect(selected).not.toBe('example-consignor-02')
  })

  it('selects nothing with an empty session and no consignor answers', () => {
    expect(
      selectedId(sessionRequest(), 'journey-1', {}, offered)
    ).toBeUndefined()
  })

  it('resolves a posted canned id to its record', async () => {
    await expect(
      chosenFor(sessionRequest(), {}, 'example-consignor-02')
    ).resolves.toMatchObject({ name: CONSIGNOR_02_NAME })
  })

  it('resolves an unknown posted id to undefined', async () => {
    await expect(
      chosenFor(sessionRequest(), {}, 'no-such-consignor')
    ).resolves.toBeUndefined()
  })

  it('resolves nothing posted to undefined', async () => {
    await expect(chosenFor(sessionRequest(), {}, '')).resolves.toBeUndefined()
  })

  it('refuses an id that is absent even when its name matches a candidate exactly', async () => {
    await expect(
      chosenFor(sessionRequest(), {}, CONSIGNOR_02_NAME)
    ).resolves.toBeUndefined()
  })
})
