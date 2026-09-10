import { describe, expect, test } from 'vitest'

import * as transporters from './index.js'
import * as addressBook from '../address-book/index.js'
import { addressCountries } from '../countries/index.js'
import * as transportReference from '../transport-reference/index.js'

describe('#parties', () => {
  test('Should return every transporter with a stable id', () => {
    const records = transporters.parties()

    expect(records.length).toBeGreaterThan(0)

    const ids = records.map((record) => record.id)
    expect(ids.every((id) => id && typeof id === 'string')).toBe(true)
    expect(new Set(ids).size).toBe(records.length)
  })

  test('Should type every transporter as one the journey can ask for', () => {
    const types = transportReference.transporterTypes()

    for (const record of transporters.parties()) {
      expect(types).toContain(record.type)
    }
  })

  test('Should hold both kinds of transporter on the one list', () => {
    const types = new Set(transporters.parties().map((record) => record.type))

    expect(types).toEqual(
      new Set([transporters.COMMERCIAL, transporters.PRIVATE])
    )
  })

  test('Should carry the approval number the address book cannot represent on every commercial record', () => {
    for (const record of transporters.commercialParties()) {
      expect(record.approvalNumber).toBeTruthy()
    }
  })

  test('Should carry every field the private-transporter form makes mandatory on every private record', () => {
    const addresses = addressCountries()

    for (const record of transporters
      .parties()
      .filter((candidate) => candidate.type === transporters.PRIVATE)) {
      expect(record.name, `${record.id} name`).toBeTruthy()

      for (const field of [
        'addressLine1',
        'townOrCity',
        'postalOrZipCode',
        'country',
        'telephoneNumber',
        'emailAddress'
      ]) {
        expect(record.address[field], `${record.id} ${field}`).toBeTruthy()
      }

      expect(addresses, `${record.id} country`).toContain(
        record.address.country
      )
      expect(record.approvalNumber).toBeUndefined()
    }
  })

  test('Should resolve synchronously, so the pickers can validate at module load', () => {
    expect(transporters.parties()).not.toBeInstanceOf(Promise)
  })
})

describe('#commercialParties', () => {
  test('Should narrow the list to the approved commercial register', () => {
    const commercial = transporters.commercialParties()

    expect(commercial.length).toBeGreaterThan(0)
    expect(commercial.length).toBeLessThan(transporters.parties().length)
    expect(
      commercial.every((record) => record.type === transporters.COMMERCIAL)
    ).toBe(true)
  })
})

describe('#party', () => {
  test('Should look a transporter up by its id', () => {
    const first = transporters.parties()[0]

    expect(transporters.party(first.id).name).toBe(first.name)
  })

  test('Should return undefined for an id that is not a transporter', () => {
    expect(transporters.party('not-a-transporter')).toBeUndefined()
  })
})

describe('separation from the address book', () => {
  test('Should not be reachable through the address book', async () => {
    // The suite already runs in stub mode, which is where both books are canned.
    const book = await addressBook.all('5900001')

    const transporterIds = transporters.parties().map((record) => record.id)

    expect(book.some((record) => transporterIds.includes(record.id))).toBe(
      false
    )
    expect(book.some((record) => record.approvalNumber)).toBe(false)
  })
})
